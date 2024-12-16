import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../../squaddie/squaddieAffiliation"
import { NextNodeHasASquaddie } from "./nextNodeHasASquaddie"
import { DamageType } from "../../../squaddie/squaddieService"
import { InBattleAttributesService } from "../../../battle/stats/inBattleAttributes"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { getResultOrThrowError } from "../../../utils/ResultOrError"

describe("next node has a squaddie", () => {
    it("returns true if squaddies are friendly, false if they are not", () => {
        const { missionMap, pathAtHead } = setupPath()

        getAllAffiliationPairs().forEach(
            ({ searchingAffiliation, blockingAffiliation }) => {
                const repository: ObjectRepository = addBlockingSquaddieToMap(
                    blockingAffiliation,
                    missionMap
                )

                const searchParameters = SearchParametersService.new({
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation: searchingAffiliation,
                        },
                    },
                    goal: {},
                })

                const squaddiesAreFriends =
                    SquaddieAffiliationService.areSquaddieAffiliationsAllies({
                        actingAffiliation: searchingAffiliation,
                        targetAffiliation: blockingAffiliation,
                    })

                const condition = new NextNodeHasASquaddie({
                    missionMap,
                    objectRepository: repository,
                })
                expect(
                    condition.shouldContinue({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(squaddiesAreFriends)
            }
        )
    })
    it("returns true if squaddies are not friendly but one is not alive", () => {
        const { missionMap, pathAtHead } = setupPath()
        getAllAffiliationPairs().forEach(
            ({ searchingAffiliation, blockingAffiliation }) => {
                const repository: ObjectRepository = addBlockingSquaddieToMap(
                    blockingAffiliation,
                    missionMap
                )
                const { battleSquaddie: blockingSquaddieBattle } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            repository,
                            "blocker 0"
                        )
                    )
                InBattleAttributesService.takeDamage({
                    inBattleAttributes:
                        blockingSquaddieBattle.inBattleAttributes,
                    damageToTake: 9001,
                    damageType: DamageType.UNKNOWN,
                })

                const searchParameters = SearchParametersService.new({
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation: searchingAffiliation,
                        },
                    },
                    goal: {},
                })

                const condition = new NextNodeHasASquaddie({
                    missionMap,
                    objectRepository: repository,
                })
                expect(
                    condition.shouldContinue({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(true)
            }
        )
    })
    it("returns true if squaddies are not friendly but searching squaddie can stop on squaddies anyway", () => {
        const { missionMap, pathAtHead } = setupPath()
        getAllAffiliationPairs().forEach(
            ({ searchingAffiliation, blockingAffiliation }) => {
                const repository: ObjectRepository = addBlockingSquaddieToMap(
                    blockingAffiliation,
                    missionMap
                )

                const searchParameters = SearchParametersService.new({
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation: searchingAffiliation,
                        },
                    },
                    pathStopConstraints: {
                        canStopOnSquaddies: true,
                    },
                    goal: {},
                })

                const condition = new NextNodeHasASquaddie({
                    missionMap,
                    objectRepository: repository,
                })
                expect(
                    condition.shouldContinue({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(true)
            }
        )
    })
    it("returns true if squaddies are not friendly but searching squaddie can pass through squaddies", () => {
        const { missionMap, pathAtHead } = setupPath()
        getAllAffiliationPairs().forEach(
            ({ searchingAffiliation, blockingAffiliation }) => {
                const repository: ObjectRepository = addBlockingSquaddieToMap(
                    blockingAffiliation,
                    missionMap
                )

                const searchParameters = SearchParametersService.new({
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation: searchingAffiliation,
                            canCrossThroughUnfriendlySquaddies: true,
                        },
                    },
                    goal: {},
                })

                const condition = new NextNodeHasASquaddie({
                    missionMap,
                    objectRepository: repository,
                })
                expect(
                    condition.shouldContinue({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(true)
            }
        )
    })
    it("returns true if there is no squaddie at the location", () => {
        const { missionMap, pathAtHead } = setupPath()

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const searchParameters = SearchParametersService.new({
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                },
            },
            goal: {},
        })

        const condition = new NextNodeHasASquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if the searching squaddie has an unknown affiliation", () => {
        const { missionMap, pathAtHead } = setupPath()

        const searchingAffiliation: SquaddieAffiliation =
            SquaddieAffiliation.UNKNOWN

        ;[
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((blockingAffiliation) => {
            const repository: ObjectRepository = addBlockingSquaddieToMap(
                blockingAffiliation,
                missionMap
            )

            const searchParameters = SearchParametersService.new({
                pathContinueConstraints: {
                    squaddieAffiliation: {
                        searchingSquaddieAffiliation: searchingAffiliation,
                    },
                },
                goal: {},
            })

            const condition = new NextNodeHasASquaddie({
                missionMap,
                objectRepository: repository,
            })
            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })
    })
    it("returns undefined if there is no path", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeHasASquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.shouldContinue({
                newPath: SearchPathService.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})

const setupPath = () => {
    const missionMap: MissionMap = MissionMapService.new({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
        }),
    })

    const pathAtHead = SearchPathService.newSearchPath()
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
        0
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
        1
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
        1
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
        2
    )
    return { missionMap, pathAtHead }
}

const addBlockingSquaddieToMap = (
    blockingAffiliation: SquaddieAffiliation,
    missionMap: MissionMap
) => {
    const repository: ObjectRepository = ObjectRepositoryService.new()
    const {
        battleSquaddie: blockingSquaddieBattle,
        squaddieTemplate: blockingSquaddieTemplate,
    } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
        affiliation: blockingAffiliation,
        battleId: "blocker 0",
        templateId: "blocker",
        name: "blocker",
        objectRepository: repository,
        actionTemplateIds: [],
    })
    MissionMapService.addSquaddie({
        missionMap,
        squaddieTemplateId: blockingSquaddieTemplate.squaddieId.templateId,
        battleSquaddieId: blockingSquaddieBattle.battleSquaddieId,
        coordinate: {
            q: 1,
            r: 2,
        },
    })
    return repository
}
const getAllAffiliationPairs = () => {
    const pairs: {
        searchingAffiliation: SquaddieAffiliation
        blockingAffiliation: SquaddieAffiliation
    }[] = []
    ;[
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ENEMY,
        SquaddieAffiliation.ALLY,
        SquaddieAffiliation.NONE,
    ].forEach((searchingAffiliation) => {
        pairs.push(
            ...[
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].map((blockingAffiliation) => ({
                searchingAffiliation,
                blockingAffiliation,
            }))
        )
    })
    return pairs
}
