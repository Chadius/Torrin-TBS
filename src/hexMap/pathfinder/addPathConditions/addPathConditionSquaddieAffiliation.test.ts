import { SearchParametersHelper } from "../searchParams"
import { SearchPathHelper } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieTemplateService } from "../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../squaddie/id"
import {
    FriendlyAffiliationsByAffiliation,
    SquaddieAffiliation,
} from "../../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../../../battle/battleSquaddie"
import { AddPathConditionSquaddieAffiliation } from "./addPathConditionSquaddieAffiliation"
import { DamageType, SquaddieService } from "../../../squaddie/squaddieService"

describe("AddPathConditionPathIsLessThanTotalMovement", () => {
    it("returns true if squaddies are friendly, false if they are not", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
            2
        )
        ;[
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((searchingAffiliation) => {
            ;[
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach((blockingAffiliation) => {
                const repository: ObjectRepository =
                    ObjectRepositoryService.new()
                const blockingSquaddieTemplate = SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    }),
                })
                ObjectRepositoryService.addSquaddieTemplate(
                    repository,
                    blockingSquaddieTemplate
                )
                const blockingSquaddieBattle = BattleSquaddieService.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0",
                })
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    blockingSquaddieBattle
                )
                MissionMapService.addSquaddie(
                    missionMap,
                    blockingSquaddieTemplate.squaddieId.templateId,
                    blockingSquaddieBattle.battleSquaddieId,
                    {
                        q: 1,
                        r: 2,
                    }
                )

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                })

                const squaddiesAreFriends =
                    FriendlyAffiliationsByAffiliation[searchingAffiliation][
                        blockingAffiliation
                    ] === true

                const condition = new AddPathConditionSquaddieAffiliation({
                    missionMap,
                    repository,
                })
                expect(
                    condition.shouldAddNewPath({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(squaddiesAreFriends)
            })
        })
    })
    it("returns true if squaddies are not friendly but one is not alive", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
            2
        )
        ;[
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((searchingAffiliation) => {
            ;[
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach((blockingAffiliation) => {
                const repository: ObjectRepository =
                    ObjectRepositoryService.new()
                const blockingSquaddieTemplate = SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    }),
                })
                ObjectRepositoryService.addSquaddieTemplate(
                    repository,
                    blockingSquaddieTemplate
                )
                const blockingSquaddieBattle = BattleSquaddieService.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0",
                })
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    blockingSquaddieBattle
                )
                MissionMapService.addSquaddie(
                    missionMap,
                    blockingSquaddieTemplate.squaddieId.templateId,
                    blockingSquaddieBattle.battleSquaddieId,
                    {
                        q: 1,
                        r: 2,
                    }
                )
                SquaddieService.dealDamageToTheSquaddie({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddie: blockingSquaddieBattle,
                    damage: 9001,
                    damageType: DamageType.UNKNOWN,
                })

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                })

                const condition = new AddPathConditionSquaddieAffiliation({
                    missionMap,
                    repository,
                })
                expect(
                    condition.shouldAddNewPath({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(true)
            })
        })
    })
    it("returns true if squaddies are not friendly but search parameters can stop on squaddies anyway", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
            2
        )
        ;[
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((searchingAffiliation) => {
            ;[
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach((blockingAffiliation) => {
                const repository: ObjectRepository =
                    ObjectRepositoryService.new()
                const blockingSquaddieTemplate = SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    }),
                })
                ObjectRepositoryService.addSquaddieTemplate(
                    repository,
                    blockingSquaddieTemplate
                )
                const blockingSquaddieBattle = BattleSquaddieService.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0",
                })
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    blockingSquaddieBattle
                )
                MissionMapService.addSquaddie(
                    missionMap,
                    blockingSquaddieTemplate.squaddieId.templateId,
                    blockingSquaddieBattle.battleSquaddieId,
                    {
                        q: 1,
                        r: 2,
                    }
                )

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                    canStopOnSquaddies: true,
                })

                const condition = new AddPathConditionSquaddieAffiliation({
                    missionMap,
                    repository,
                })
                expect(
                    condition.shouldAddNewPath({
                        newPath: pathAtHead,
                        searchParameters,
                    })
                ).toBe(true)
            })
        })
    })
    it("returns true if there is no squaddie at the location", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
            2
        )

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const searchParameters = SearchParametersHelper.new({
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
        })

        const condition = new AddPathConditionSquaddieAffiliation({
            missionMap,
            repository,
        })
        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if the searching squaddie has an unknown affiliation", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 2 },
            2
        )

        const searchingAffiliation: SquaddieAffiliation =
            SquaddieAffiliation.UNKNOWN

        ;[
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((blockingAffiliation) => {
            const repository: ObjectRepository = ObjectRepositoryService.new()
            const blockingSquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "blocker",
                    name: "blocker",
                    affiliation: blockingAffiliation,
                }),
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                blockingSquaddieTemplate
            )
            const blockingSquaddieBattle = BattleSquaddieService.new({
                squaddieTemplate: blockingSquaddieTemplate,
                battleSquaddieId: "blocker 0",
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                blockingSquaddieBattle
            )
            MissionMapService.addSquaddie(
                missionMap,
                blockingSquaddieTemplate.squaddieId.templateId,
                blockingSquaddieBattle.battleSquaddieId,
                {
                    q: 1,
                    r: 2,
                }
            )

            const searchParameters = SearchParametersHelper.new({
                squaddieAffiliation: searchingAffiliation,
            })

            const condition = new AddPathConditionSquaddieAffiliation({
                missionMap,
                repository,
            })
            expect(
                condition.shouldAddNewPath({
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
        const searchParameters = SearchParametersHelper.new({})

        const condition = new AddPathConditionSquaddieAffiliation({
            missionMap,
            repository,
        })
        expect(
            condition.shouldAddNewPath({
                newPath: SearchPathHelper.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})
