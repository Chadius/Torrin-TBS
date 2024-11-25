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
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { makeResult } from "../utils/ResultOrError"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import { BattlePhaseStateService } from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../battle/orchestrator/battleOrchestratorComponent"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { OrchestratorUtilities } from "../battle/orchestratorComponents/orchestratorUtils"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { MouseButton } from "../utils/mouseConfig"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { SummaryHUDStateService } from "../battle/hud/summaryHUD"
import { SquaddieSummaryPopoverPosition } from "../battle/hud/playerActionPanel/squaddieSummaryPopover"
import { BattlePlayerActionConfirm } from "../battle/orchestratorComponents/battlePlayerActionConfirm"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { BattleActionDecisionStepService } from "../battle/actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../battle/history/battleAction/battleActionRecorder"
import { BattleActionService } from "../battle/history/battleAction/battleAction"
import { BattleActionsDuringTurnService } from "../battle/history/battleAction/battleActionsDuringTurn"
import { TargetConstraintsService } from "../action/targetConstraints"
import SpyInstance = jest.SpyInstance

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
            actionPoints: 2,
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 0,
            },
        })

        targeting = new BattlePlayerSquaddieTarget()
        confirm = new BattlePlayerActionConfirm()
    })

    describe("when the user cancels after selecting an action", () => {
        let orchestratorSpy: SpyInstance
        let messageSpy: SpyInstance

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

            orchestratorSpy = jest.spyOn(
                OrchestratorUtilities,
                "generateMessagesIfThePlayerCanActWithANewSquaddie"
            )
            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                location: {
                    q: 0,
                    r: 0,
                },
            })

            targeting.update(gameEngineState, graphicsContext)
        })
        afterEach(() => {
            orchestratorSpy.mockRestore()
        })

        const cancelMethods = [
            {
                name: "mouse clicks ACCEPT on lower right corner",
                action: () => {
                    targeting.mouseEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: ScreenDimensions.SCREEN_WIDTH,
                        mouseY: ScreenDimensions.SCREEN_HEIGHT,
                        mouseButton: MouseButton.ACCEPT,
                    })
                },
            },
            {
                name: "mouse clicks CANCEL",
                action: () => {
                    targeting.mouseEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: 0,
                        mouseY: 0,
                        mouseButton: MouseButton.CANCEL,
                    })
                },
            },
            {
                name: "keyboard presses CANCEL",
                action: () => {
                    targeting.keyEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentKeyEventType.PRESSED,
                        keyCode: JSON.parse(
                            process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL
                        )[0],
                    })
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
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState
                ).toBeTruthy()
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.showSummaryHUD
                ).toBeTruthy()
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).toBeTruthy()
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                        .battleSquaddieId
                ).toEqual(playerBattleSquaddie.battleSquaddieId)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.showPlayerCommand
                ).toBeTruthy()
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState
                ).toBeTruthy()
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
            location: {
                q: 0,
                r: 0,
            },
        })

        targeting.update(gameEngineState, graphicsContext)
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
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
            location: {
                q: 0,
                r: 1,
            },
        })
        MissionMapService.addSquaddie({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 0,
            },
        })

        targeting.update(gameEngineState, graphicsContext)

        let { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: 0,
                r: 1,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            })
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })
        targeting.update(gameEngineState, graphicsContext)

        expect(targeting.hasSelectedValidTarget).toBeTruthy()

        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
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
        MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION
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
        SummaryHUDStateService.new({ mouseSelectionLocation: { x: 0, y: 0 } })
    SummaryHUDStateService.createCommandWindow({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        resourceHandler: gameEngineState.resourceHandler,
        objectRepository: gameEngineState.repository,
        gameEngineState,
    })
    SummaryHUDStateService.setMainSummaryPopover({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        resourceHandler: gameEngineState.resourceHandler,
        objectRepository: gameEngineState.repository,
        gameEngineState,
        battleSquaddieId,
        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
    })

    return gameEngineState
}
