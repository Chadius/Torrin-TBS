import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { CreateNewNeighboringCoordinates } from "../../hexMap/hexGridDirection"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TargetingResults, TargetingResultsService } from "./targetingService"

import {
    HexCoordinate,
    NewHexCoordinateFromNumberPair,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"

describe("Targeting Service", () => {
    let longswordAction: ActionTemplate
    let sirCamilSquaddieTemplate: SquaddieTemplate
    let sirCamilBattleSquaddie: BattleSquaddie
    let squaddieRepo: ObjectRepository

    beforeEach(() => {
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                }),
            ],
        })

        squaddieRepo = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: sirCamilSquaddieTemplate,
            battleSquaddie: sirCamilBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Sir Camil",
            templateId: "Sir Camil",
            battleId: "Sir Camil 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplates: [longswordAction],
            squaddieRepository: squaddieRepo,
        }))
    })

    it("will indicate which locations to highlight", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(6)
        expect(results.locationsInRange).toEqual(
            expect.arrayContaining(CreateNewNeighboringCoordinates(1, 1))
        )
    })

    it("will highlight nothing if the acting squaddie is not on the map", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(0)
    })

    it("will respect walls and ranged attacks", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        let longbowAction = ActionTemplateService.new({
            name: "longbow",
            id: "longbow",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 2,
                    maximumRange: 3,
                }),
            ],
        })

        squaddieRepo = ObjectRepositoryService.new()
        let {
            squaddieTemplate: archerSquaddieTemplate,
            battleSquaddie: archerBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Archer",
            templateId: "archer",
            battleId: "Archer 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplates: [longbowAction],
            squaddieRepository: squaddieRepo,
        })

        battleMap.addSquaddie(
            archerSquaddieTemplate.squaddieId.templateId,
            archerBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longbowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: archerSquaddieTemplate,
                actingBattleSquaddie: archerBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(4)
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([0, 0])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([0, 3])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([1, 3])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([2, 2])
        )
    })

    it("will highlight unfriendly squaddies if they are in range", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        let {
            squaddieTemplate: playerTeamStatic,
            battleSquaddie: playerTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player",
            templateId: "player",
            battleId: "Player 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        })

        battleMap.addSquaddie(
            playerTeamStatic.squaddieId.templateId,
            playerTeamDynamic.battleSquaddieId,
            { q: 1, r: 0 }
        )

        let {
            squaddieTemplate: enemyTeamStatic,
            battleSquaddie: enemyTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy",
            templateId: "enemy",
            battleId: "enemy 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        })

        battleMap.addSquaddie(
            enemyTeamStatic.squaddieId.templateId,
            enemyTeamDynamic.battleSquaddieId,
            { q: 2, r: 1 }
        )

        let {
            squaddieTemplate: enemyFarAwayTeamStatic,
            battleSquaddie: enemyFarAwayTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy far away",
            templateId: "enemy far away",
            battleId: "enemy far away 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        })

        battleMap.addSquaddie(
            enemyFarAwayTeamStatic.squaddieId.templateId,
            enemyFarAwayTeamDynamic.battleSquaddieId,
            { q: 0, r: 3 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.battleSquaddieIdsInRange).toHaveLength(1)
        expect(results.battleSquaddieIdsInRange).toContain(
            enemyTeamDynamic.battleSquaddieId
        )
    })

    it("will ignore terrain costs when targeting", () => {
        let longbowAction: ActionTemplate = ActionTemplateService.new({
            name: "longbow",
            id: "longbow",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 3,
                }),
            ],
        })

        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["2 2 2 2 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 0, r: 0 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longbowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(3)
        expect(results.locationsInRange).toStrictEqual([
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: 0, r: 3 },
        ])
    })

    describe("highlightTargetRange using a gameEngineState", () => {
        let gameEngineState: GameEngineState
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            const battleMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })
            battleMap.addSquaddie(
                sirCamilSquaddieTemplate.squaddieId.templateId,
                sirCamilBattleSquaddie.battleSquaddieId,
                { q: 1, r: 1 }
            )

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: longswordAction.id,
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap: battleMap,
                        campaignId: "test campaign",
                        missionId: "test mission",
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
            })

            highlightRangeSpy = jest.spyOn(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                "highlightTiles"
            )
        })

        it("will return the tiles in range", () => {
            const actionRange: HexCoordinate[] =
                TargetingResultsService.highlightTargetRange(gameEngineState)
            expect(actionRange).toHaveLength(6)
            expect(actionRange).toEqual(
                expect.arrayContaining(CreateNewNeighboringCoordinates(1, 1))
            )
        })

        it("will highlight the tiles", () => {
            const actionRange: HexCoordinate[] =
                TargetingResultsService.highlightTargetRange(gameEngineState)
            expect(highlightRangeSpy).toHaveBeenCalledWith([
                {
                    tiles: actionRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            ])
        })
    })
})
