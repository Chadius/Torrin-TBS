import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieTemplateService } from "../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../squaddie/id"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../../../battle/battleSquaddie"
import { DamageType } from "../../../squaddie/squaddieService"
import { PathDoesNotEndOnAnotherSquaddie } from "./pathDoesNotEndOnAnotherSquaddie"
import { InBattleAttributesService } from "../../../battle/stats/inBattleAttributes"
import { describe, expect, it } from "vitest"

describe("PathCanStopConditionNotOnASquaddie", () => {
    it("returns false if there is a squaddie at the location", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const blockingSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "blocker",
                name: "blocker",
                affiliation: SquaddieAffiliation.UNKNOWN,
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
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: blockingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: blockingSquaddieBattle.battleSquaddieId,
            coordinate: {
                q: 1,
                r: 2,
            },
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

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })
    it("returns true because the squaddie can stop at its own location", () => {
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

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const blockingSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "blocker",
                name: "blocker",
                affiliation: SquaddieAffiliation.UNKNOWN,
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
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: blockingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: blockingSquaddieBattle.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if the squaddie is not alive", () => {
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

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const blockingSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "blocker",
                name: "blocker",
                affiliation: SquaddieAffiliation.UNKNOWN,
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
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: blockingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: blockingSquaddieBattle.battleSquaddieId,
            coordinate: {
                q: 1,
                r: 2,
            },
        })
        InBattleAttributesService.takeDamage({
            inBattleAttributes: blockingSquaddieBattle.inBattleAttributes,
            damageToTake: 9001,
            damageType: DamageType.UNKNOWN,
        })

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if squaddies are not friendly but search parameters can stop on squaddies anyway", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const blockingSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "blocker",
                name: "blocker",
                affiliation: SquaddieAffiliation.UNKNOWN,
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
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: blockingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: blockingSquaddieBattle.battleSquaddieId,
            coordinate: {
                q: 1,
                r: 2,
            },
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

        const searchParameters = SearchParametersService.new({
            pathStopConstraints: {
                canStopOnSquaddies: true,
            },
            goal: {},
        })

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if there is no squaddie at the location", () => {
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

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const searchParameters = SearchParametersService.new({
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                },
            },
            goal: {},
        })

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
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

        const condition = new PathDoesNotEndOnAnotherSquaddie({
            missionMap,
            objectRepository: repository,
        })
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: SearchPathService.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})
