import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { PlayerHudController } from "./playerHudController"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { CampaignService } from "../../campaign/campaign"
import * as mocks from "../..//utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../..//utils/test/mocks"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import {
    BattleOrchestrator,
    BattleOrchestratorMode,
} from "../orchestrator/battleOrchestrator"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { SquaddieTurnService } from "../../squaddie/turn"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { BattlePhase } from "./battlePhaseTracker"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { beforeEach, describe, expect, it } from "vitest"

describe("PlayerHUDController", () => {
    let gameEngineState: GameEngineState
    let controller: PlayerHudController
    let orchestrator: BattleOrchestrator
    let repository: ObjectRepository
    let missionMap: MissionMap

    beforeEach(() => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 "],
            }),
        })

        repository = ObjectRepositoryService.new()

        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionMap,
                    campaignId: "campaignId",
                    missionId: "missionId",
                }),
            }),
            resourceHandler: mocks.mockResourceHandler(
                new MockedP5GraphicsBuffer()
            ),
            repository,
            campaign: CampaignService.default(),
        })

        controller = new PlayerHudController()
        orchestrator = new BattleOrchestrator({
            version: "TEST",
            computerSquaddieSelector: undefined,
            cutscenePlayer: undefined,
            initializeBattle: undefined,
            mapDisplay: undefined,
            phaseController: undefined,
            playerSquaddieSelector: undefined,
            playerSquaddieTarget: undefined,
            squaddieMover: undefined,
            squaddieUsesActionOnMap: undefined,
            squaddieUsesActionOnSquaddie: undefined,
            playerActionConfirm: undefined,
            playerHudController: controller,
        })

        orchestrator.mode = BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
    })

    it("Is always completed", () => {
        expect(controller.hasCompleted(gameEngineState)).toBeTruthy()
    })

    describe("Change mode based on selected inputs", () => {
        let playerBattleSquaddie: BattleSquaddie
        let playerSquaddieTemplate: SquaddieTemplate
        let playerBattleSquaddieId: string = "playerBattleSquaddieId"
        let enemyBattleSquaddie: BattleSquaddie
        let enemySquaddieTemplate: SquaddieTemplate
        let enemyBattleSquaddieId: string = "enemyBattleSquaddieId"
        let singleTargetAction: ActionTemplate

        beforeEach(() => {
            singleTargetAction = ActionTemplateService.new({
                id: "single target",
                name: "single target",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        damageDescriptions: { [DamageType.BODY]: 2 },
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            TARGET_FOE: true,
                        }),
                    }),
                ],
            })
            ;({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                templateId: "player_soldier",
                name: "Player Soldier",
                affiliation: SquaddieAffiliation.PLAYER,
                battleId: playerBattleSquaddieId,
                objectRepository: repository,
                actionTemplateIds: [singleTargetAction.id],
            }))
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: "player_soldier",
                battleSquaddieId: playerBattleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })
            const playerTeam = BattleSquaddieTeamService.new({
                id: "player_team",
                name: "player_team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [playerBattleSquaddieId],
            })
            gameEngineState.battleOrchestratorState.battleState.teams.push(
                playerTeam
            )
            ;({
                squaddieTemplate: enemySquaddieTemplate,
                battleSquaddie: enemyBattleSquaddie,
            } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                templateId: "enemy_thief",
                name: "Enemy Thief",
                affiliation: SquaddieAffiliation.ENEMY,
                battleId: enemyBattleSquaddieId,
                objectRepository: repository,
                actionTemplateIds: [singleTargetAction.id],
            }))
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: "enemy_soldier",
                battleSquaddieId: enemyBattleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 2,
                },
            })
            const enemyTeam = BattleSquaddieTeamService.new({
                id: "enemy_team",
                name: "enemy_team",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: [enemyBattleSquaddieId],
            })
            gameEngineState.battleOrchestratorState.battleState.teams.push(
                enemyTeam
            )

            gameEngineState.battleOrchestratorState.battleState.battlePhaseState =
                {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.PLAYER,
                }
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
        })
        it("recommends computer selector mode when no players can take a turn and there is no pending animation", () => {
            SquaddieTurnService.endTurn(playerBattleSquaddie.squaddieTurn)

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR
            )
        })
        it("recommends player squaddie selector when the actor is not set", () => {
            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            )
        })
        it("recommends player squaddie selector when no action is set", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddieId,
            })

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            )
        })
        it("recommends squaddie on map when the actor ends its turn", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                endTurn: true,
            })

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            )
        })
        it("recommends squaddie mover when the actor moves somewhere", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                movement: true,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                targetLocation: { q: 0, r: 1 },
            })

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.SQUADDIE_MOVER
            )
        })
        it("recommends player squaddie target when a action that needs a target is set", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: singleTargetAction.id,
            })

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
            )
        })
        it("recommends squaddie on squaddie when the action and target are selected, even if this ends their turn", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: singleTargetAction.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                targetLocation: { q: 0, r: 2 },
            })

            const battleAction: BattleAction = BattleActionService.new({
                actor: { actorBattleSquaddieId: playerBattleSquaddieId },
                action: { actionTemplateId: singleTargetAction.id },
                effect: { squaddie: [] },
            })
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                battleAction
            )

            SquaddieTurnService.endTurn(playerBattleSquaddie.squaddieTurn)

            const recommendedChanges =
                controller.recommendStateChanges(gameEngineState)
            expect(recommendedChanges.nextMode).toEqual(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
            )
        })
    })
})
