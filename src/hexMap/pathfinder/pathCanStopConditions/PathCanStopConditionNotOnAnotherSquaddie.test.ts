import { SearchParametersHelper } from "../searchParams"
import { SearchPathHelper } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMap } from "../../terrainTileMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieTemplateService } from "../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../squaddie/id"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../../../battle/battleSquaddie"
import { DamageType, SquaddieService } from "../../../squaddie/squaddieService"
import { PathCanStopConditionNotOnAnotherSquaddie } from "./pathCanStopConditionNotOnAnotherSquaddie"

describe("PathCanStopConditionNotOnASquaddie", () => {
    it("returns false if there is a squaddie at the location", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
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
        MissionMapService.addSquaddie(
            missionMap,
            blockingSquaddieTemplate.squaddieId.templateId,
            blockingSquaddieBattle.battleSquaddieId,
            {
                q: 1,
                r: 2,
            }
        )

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

        const searchParameters = SearchParametersHelper.new({})

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })
    it("returns true because the squaddie can stop at its own location", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
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
        MissionMapService.addSquaddie(
            missionMap,
            blockingSquaddieTemplate.squaddieId.templateId,
            blockingSquaddieBattle.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )

        const searchParameters = SearchParametersHelper.new({})

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if the squaddie is not alive", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
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

        const searchParameters = SearchParametersHelper.new({})

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if squaddies are not friendly but search parameters can stop on squaddies anyway", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
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
        MissionMapService.addSquaddie(
            missionMap,
            blockingSquaddieTemplate.squaddieId.templateId,
            blockingSquaddieBattle.battleSquaddieId,
            {
                q: 1,
                r: 2,
            }
        )

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

        const searchParameters = SearchParametersHelper.new({
            canStopOnSquaddies: true,
        })

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns true if there is no squaddie at the location", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
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

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns undefined if there is no path", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const repository: ObjectRepository = ObjectRepositoryService.new()
        const searchParameters = SearchParametersHelper.new({})

        const condition = new PathCanStopConditionNotOnAnotherSquaddie({
            missionMap,
            repository,
        })
        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: SearchPathHelper.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})
