import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../action/template/actionEffectTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import { BattlePhaseStateService } from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/playerActionTarget/battlePlayerSquaddieTarget"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/battleState/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { OrchestratorUtilities } from "../battle/orchestratorComponents/orchestratorUtils"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { MouseButton } from "../utils/mouseConfig"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { SummaryHUDStateService } from "../battle/hud/summary/summaryHUD"
import { BattlePlayerActionConfirm } from "../battle/orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import { BattleActionDecisionStepService } from "../battle/actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../battle/history/battleAction/battleActionRecorder"
import { BattleActionService } from "../battle/history/battleAction/battleAction"
import { BattleActionsDuringTurnService } from "../battle/history/battleAction/battleActionsDuringTurn"
import { TargetConstraintsService } from "../action/targetConstraints"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { BattlePlayerActionConfirmSpec } from "./spec/battlePlayerActionConfirmSpec"
import { BattlePlayerActionTargetSpec } from "./spec/battlePlayerSquaddieTargetSpec"
import { SummaryHUDSpec } from "./spec/summaryHUD"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputTestService } from "../utils/test/playerInput"
import { BattleHUDListener } from "../battle/hud/battleHUD/battleHUDListener"
import { AddSquaddieToRepositorySpec } from "./spec/addSquaddieToRepositorySpec"

describe("User cancels the previewed action", () => {
    let objectRepository: ObjectRepository
    let gameEngineState: GameEngineState

    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap
    let graphicsContext: MockedP5GraphicsBuffer

    let targeting: BattlePlayerSquaddieTarget
    let confirm: BattlePlayerActionConfirm

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ;({ playerSquaddieTemplate, playerBattleSquaddie } =
            AddSquaddieToRepositorySpec.addSinglePlayerSquaddie(
                objectRepository,
                attackAction
            ))

        graphicsContext = new MockedP5GraphicsBuffer()
        graphicsContext.textWidth = vi.fn().mockReturnValue(1)

        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.areAllResourcesLoaded = vi
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        targeting = new BattlePlayerSquaddieTarget()
        confirm = new BattlePlayerActionConfirm()
    })

    describe("when the user cancels after selecting an action", () => {
        let orchestratorSpy: MockInstance
        let messageSpy: MockInstance

        beforeEach(() => {
            gameEngineState = getGameEngineState({
                repository: objectRepository,
                resourceHandler,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            })
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: attackAction.id,
            })

            orchestratorSpy = vi.spyOn(
                OrchestratorUtilities,
                "generateMessagesIfThePlayerCanActWithANewSquaddie"
            )
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })

            BattlePlayerActionTargetSpec.updateUntilCancelButtonIsReady({
                gameEngineState,
                graphicsContext,
                targeting,
            })
        })
        afterEach(() => {
            orchestratorSpy.mockRestore()
        })

        const cancelMethods = [
            {
                name: "mouse clicks the center of the Cancel button on screen",
                action: () => {
                    BattlePlayerActionTargetSpec.clickOnCancelButton({
                        targeting: targeting,
                        gameEngineState: gameEngineState,
                    })
                },
            },
            {
                name: "mouse clicks CANCEL",
                action: () => {
                    BattlePlayerActionTargetSpec.clickCancelButtonOnMouse({
                        targeting,
                        gameEngineState: gameEngineState,
                    })
                },
            },
            {
                name: "keyboard presses CANCEL",
                action: () => {
                    targeting.keyEventHappened(
                        gameEngineState,
                        PlayerInputTestService.pressCancelKey()
                    )
                },
            },
        ]

        it.each(cancelMethods)(
            `completes the targeting module via $name`,
            ({ action }) => {
                action()
                expect(targeting.hasCompleted(gameEngineState)).toBeTruthy()
            }
        )

        it.each(cancelMethods)(
            "sends a message it was canceled $name",
            ({ action }) => {
                action()
                expect(messageSpy).toBeCalledWith({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                    gameEngineState,
                })
            }
        )

        it.each(cancelMethods)(
            "Sees if it should send a message if the player controlled squaddie has not started their turn via $name",
            ({ action }) => {
                action()
                targeting.recommendStateChanges(gameEngineState)
                expect(orchestratorSpy).toBeCalledWith(gameEngineState)
            }
        )

        it.each(cancelMethods)(
            "Shows a summary window and a player command via $name",
            ({ action }) => {
                action()

                SummaryHUDStateService.draw({
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    gameEngineState,
                    resourceHandler: gameEngineState.resourceHandler,
                    graphicsBuffer: graphicsContext,
                })

                SummaryHUDSpec.expectActorNameToBe(gameEngineState, "player")
            }
        )
    })

    it("Ensure if this is the 2nd action the user cannot cancel their turn. via $name", () => {
        gameEngineState = getGameEngineState({
            repository: objectRepository,
            resourceHandler,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        playerBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: attackAction.id },
                effect: {
                    squaddie: [],
                },
            })
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: attackAction.id,
        })

        MissionMapService.addSquaddie({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        BattlePlayerActionTargetSpec.updateUntilCancelButtonIsReady({
            targeting: targeting,
            gameEngineState: gameEngineState,
            graphicsContext: graphicsContext,
        })
        BattlePlayerActionTargetSpec.clickOnCancelButton({
            targeting: targeting,
            gameEngineState: gameEngineState,
        })

        expect(targeting.hasCompleted(gameEngineState)).toBeTruthy()
        targeting.recommendStateChanges(gameEngineState)
        expect(
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ).toBeTruthy()
        expect(
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)
        expect(
            BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ).action.actionTemplateId
        ).toEqual(attackAction.id)
    })

    it("After Clicking a target, Canceling the confirmation should not change BattleActionRecorder - we’re still previewing via $name", () => {
        const enemySquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                templateId: "enemy",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            enemySquaddieTemplate
        )

        const enemyBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            enemyBattleSquaddie
        )

        gameEngineState = getGameEngineState({
            repository: objectRepository,
            resourceHandler,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        playerBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: attackAction.id },
                effect: {
                    squaddie: [],
                },
            })
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: attackAction.id,
        })

        MissionMapService.addSquaddie({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 1,
            },
        })
        MissionMapService.addSquaddie({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        targeting.update({
            gameEngineState,
            graphicsContext,
        })

        let { x: mouseX, y: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 0,
                    r: 1,
                },
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        })
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        })
        targeting.update({
            gameEngineState,
            graphicsContext,
        })

        const context = targeting.data.getContext()
        expect(context.hasSelectedValidTarget).toBeTruthy()

        confirm.update({
            gameEngineState,
            graphicsContext,
            resourceHandler,
        })
        BattlePlayerActionConfirmSpec.clickOnCancelButton({
            confirm: confirm,
            gameEngineState: gameEngineState,
        })

        expect(
            BattleActionRecorderService.isAnimationQueueEmpty(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
        ).toBeTruthy()
        expect(
            BattleActionsDuringTurnService.getAll(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder.actionsAlreadyAnimatedThisTurn
            )
        ).toHaveLength(1)
    })
})

const getGameEngineState = ({
    repository,
    resourceHandler,
    battleSquaddieId,
}: {
    repository: ObjectRepository
    resourceHandler: ResourceHandler
    battleSquaddieId: string
}): GameEngineState => {
    const gameEngineState = GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera: new BattleCamera(0, 0),
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
                missionMap: MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 "],
                    }),
                }),
            }),
        }),
        repository,
        campaign: CampaignService.default(),
        resourceHandler,
    })

    const battleHUDListener = new BattleHUDListener("testBattleListener")
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    )

    gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        battleSquaddieId,
    })
    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
        SummaryHUDStateService.new()
    SummaryHUDStateService.createActorTiles({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        objectRepository: gameEngineState.repository,
        gameEngineState,
    })
    return gameEngineState
}
