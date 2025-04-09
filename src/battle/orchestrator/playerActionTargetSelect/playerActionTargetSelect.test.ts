import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerActionTargetSelect } from "./playerActionTargetSelect"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../../resource/resourceHandler"
import * as mocks from "../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { BattleOrchestratorMode } from "../battleOrchestrator"
import {
    PlayerActionTargetStateEnum,
    PlayerActionTargetTransitionEnum,
} from "./stateMachine"
import { CampaignService } from "../../../campaign/campaign"
import { BattleOrchestratorStateService } from "../battleOrchestratorState"
import { BattleStateService } from "../../battleState/battleState"
import { MapSearchTestUtils } from "../../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../battleOrchestratorComponent"
import { MouseButton } from "../../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"

describe("Player Action Target Select", () => {
    let playerActionTargetSelect: PlayerActionTargetSelect
    let gameEngineState: GameEngineState
    let graphicsContext: GraphicsBuffer
    let resourceHandler: ResourceHandler
    let stateMachineSpy: MockInstance
    let viewControllerSpy: MockInstance

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap:
                        MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                    campaignId: "campaignId",
                    missionId: "missionId",
                }),
            }),
            campaign: CampaignService.default(),
        })
        playerActionTargetSelect = new PlayerActionTargetSelect()
    })

    afterEach(() => {
        if (stateMachineSpy) stateMachineSpy.mockRestore()
        if (viewControllerSpy) viewControllerSpy.mockRestore()
    })

    describe("create update and destroy components during life cycle", () => {
        beforeEach(() => {
            stateMachineSpy = vi
                .spyOn(playerActionTargetSelect, "updateStateMachine")
                .mockReturnValue()
            viewControllerSpy = vi
                .spyOn(playerActionTargetSelect, "updateViewController")
                .mockReturnValue()
        })

        describe("it will run the updaters when it updates", () => {
            const updateTests = [
                {
                    name: "view controller",
                    getUpdate: () => viewControllerSpy,
                },
                {
                    name: "state machine",
                    getUpdate: () => stateMachineSpy,
                },
            ]

            it.each(updateTests)(`$name`, ({ getUpdate }) => {
                playerActionTargetSelect.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })
                expect(getUpdate()).toBeCalled()
            })
        })

        const fieldTests = [
            {
                name: "context",
                getField: () => playerActionTargetSelect.context,
            },
            {
                name: "view controller",
                getField: () => playerActionTargetSelect.viewController,
            },
            {
                name: "state machine",
                getField: () => playerActionTargetSelect.stateMachine,
            },
        ]
        it.each(fieldTests)(
            `$name is a singleton after the first update`,
            ({ getField }) => {
                expect(getField()).toBeUndefined()
                playerActionTargetSelect.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })
                const originalField = getField()
                expect(originalField).not.toBeUndefined()

                playerActionTargetSelect.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })
                expect(getField()).toBe(originalField)
            }
        )
        it.each(fieldTests)(
            `$name will be destroyed on reset`,
            ({ getField }) => {
                playerActionTargetSelect.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })
                playerActionTargetSelect.reset(gameEngineState)
                expect(getField()).toBeUndefined()
            }
        )
    })

    it("will not draw if the state machine is in an unsupported state", () => {
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        playerActionTargetSelect.lazyInitializeContext(gameEngineState)
        playerActionTargetSelect.lazyInitializeStateMachine()
        stateMachineSpy = vi
            .spyOn(playerActionTargetSelect.stateMachine, "updateUntil")
            .mockReturnValue()
        viewControllerSpy = vi
            .spyOn(playerActionTargetSelect, "updateViewController")
            .mockReturnValue()
        playerActionTargetSelect.context.externalFlags.useLegacySelector = true
        playerActionTargetSelect.update({
            gameEngineState,
            graphicsContext,
            resourceHandler,
        })
        expect(viewControllerSpy).not.toBeCalled()
    })

    const stubStateMachineAndViewControllerThenUpdate = () => {
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        playerActionTargetSelect.lazyInitializeContext(gameEngineState)
        playerActionTargetSelect.lazyInitializeStateMachine()
        stateMachineSpy = vi
            .spyOn(playerActionTargetSelect.stateMachine, "updateUntil")
            .mockReturnValue()
        viewControllerSpy = vi
            .spyOn(playerActionTargetSelect, "updateViewController")
            .mockReturnValue()
        playerActionTargetSelect.update({
            gameEngineState,
            graphicsContext,
            resourceHandler,
        })
    }
    describe("update runs the state machine", () => {
        beforeEach(() => {
            stubStateMachineAndViewControllerThenUpdate()
        })

        it("is not complete if the state machine has not finished", () => {
            expect(
                playerActionTargetSelect.hasCompleted(gameEngineState)
            ).toBeFalsy()
        })
    })

    it("update runs the view controller", () => {
        stubStateMachineAndViewControllerThenUpdate()
        expect(viewControllerSpy).toBeCalledWith({
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            graphicsContext,
        })
    })

    describe("when the state machine is finished processing", () => {
        const tests = [
            {
                name: "finished",
                targetedState: PlayerActionTargetStateEnum.FINISHED,
            },
            {
                name: "waiting for confirm",
                targetedState:
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM,
            },
        ]

        const setup = (targetedState: PlayerActionTargetStateEnum) => {
            playerActionTargetSelect.lazyInitializeContext(gameEngineState)
            playerActionTargetSelect.lazyInitializeStateMachine()
            stateMachineSpy = vi
                .spyOn(playerActionTargetSelect.stateMachine, "update")
                .mockReturnValue({
                    stateMachineId: "stateMachineId",
                    transitionFired: PlayerActionTargetTransitionEnum.FINISHED,
                    actions: [],
                    targetedState,
                })
            viewControllerSpy = vi
                .spyOn(playerActionTargetSelect, "updateViewController")
                .mockReturnValue()
            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
        }

        afterEach(() => {
            stateMachineSpy.mockRestore()
        })

        it.each(tests)(
            "updates the state machine $name",
            ({ targetedState }) => {
                setup(targetedState)
                expect(stateMachineSpy).toBeCalled()
            }
        )

        it.each(tests)(
            "the state machine is in the $name state",
            ({ targetedState }) => {
                setup(targetedState)
                expect(
                    playerActionTargetSelect.stateMachine.currentState
                ).toEqual(targetedState)
            }
        )

        it.each(tests)(
            "hasCompleted the component when in $name",
            ({ targetedState }) => {
                setup(targetedState)
                expect(
                    playerActionTargetSelect.hasCompleted(gameEngineState)
                ).toBe(true)
            }
        )
    })

    describe("Select next mode based on state machine transition", () => {
        const tests = [
            {
                name: "player selects an action where no targets are found",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND,
                mockPostTransition: () => {},
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            {
                name: "the state machine does not support this situation",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS,
                mockPostTransition: () => {},
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            },
            {
                name: "the state machine confirms the action",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION,
                mockPostTransition: () => {
                    BattleActionDecisionStepService.setConfirmedTarget({
                        actionDecisionStep:
                            playerActionTargetSelect.context
                                .battleActionDecisionStep,
                        targetCoordinate: { q: 0, r: 1 },
                    })
                },
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            {
                name: "the player cancels the action",
                triggeredTransition:
                    PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION,
                mockPostTransition: () => {},
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
        ]

        let stateMachineSpy: MockInstance
        afterEach(() => {
            stateMachineSpy.mockRestore()
        })

        const setup = (
            triggeredTransition: PlayerActionTargetTransitionEnum,
            mockPostTransition: () => void
        ) => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            playerActionTargetSelect.lazyInitializeContext(gameEngineState)
            playerActionTargetSelect.lazyInitializeStateMachine()
            stateMachineSpy = vi
                .spyOn(
                    playerActionTargetSelect.stateMachine,
                    "getTriggeredTransition"
                )
                .mockReturnValueOnce(triggeredTransition)
            viewControllerSpy = vi
                .spyOn(playerActionTargetSelect, "updateViewController")
                .mockReturnValue()

            playerActionTargetSelect.update({
                gameEngineState,
                graphicsContext,
                resourceHandler,
            })
            mockPostTransition()
        }
        it.each(tests)(
            `$name will expect the state machine to be called`,
            ({ triggeredTransition, mockPostTransition }) => {
                setup(triggeredTransition, mockPostTransition)
                expect(stateMachineSpy).toBeCalled()
            }
        )

        it.each(tests)(
            `$name has completed`,
            ({ triggeredTransition, mockPostTransition }) => {
                setup(triggeredTransition, mockPostTransition)
                expect(
                    playerActionTargetSelect.hasCompleted(gameEngineState)
                ).toBeTruthy()
            }
        )

        it.each(tests)(
            `$name will recommend a new mode`,
            ({ triggeredTransition, nextMode, mockPostTransition }) => {
                setup(triggeredTransition, mockPostTransition)
                const recommendedInfo =
                    playerActionTargetSelect.recommendStateChanges(
                        gameEngineState
                    )
                expect(recommendedInfo.nextMode).toBe(nextMode)
            }
        )
    })

    const mouseInputTests: {
        name: string
        playerInputEvent: OrchestratorComponentMouseEvent
        createInputOnComponent: (
            playerInputEvent: OrchestratorComponentMouseEvent
        ) => void
    }[] = [
        {
            name: "mouseReleased",
            playerInputEvent: {
                eventType: OrchestratorComponentMouseEventType.RELEASE,
                mouseRelease: {
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                },
            },
            createInputOnComponent: (
                playerInputEvent: OrchestratorComponentMouseEvent
            ) => {
                playerActionTargetSelect.mouseEventHappened(
                    gameEngineState,
                    playerInputEvent
                )
            },
        },
    ]

    const keyboardInputTests: {
        name: string
        playerInputEvent: OrchestratorComponentKeyEvent
        createInputOnComponent: (
            playerInputEvent: OrchestratorComponentKeyEvent
        ) => void
    }[] = [
        {
            name: "keyPressed",
            playerInputEvent: {
                eventType: OrchestratorComponentKeyEventType.PRESSED,
                keyCode: 1,
            },
            createInputOnComponent: (
                playerInputEvent: OrchestratorComponentKeyEvent
            ) => {
                playerActionTargetSelect.keyEventHappened(
                    gameEngineState,
                    playerInputEvent
                )
            },
        },
    ]

    describe("pass inputs to state machine", () => {
        let acceptPlayerInputSpy: MockInstance

        beforeEach(() => {
            playerActionTargetSelect.lazyInitializeContext(gameEngineState)
            playerActionTargetSelect.lazyInitializeStateMachine()
            acceptPlayerInputSpy = vi.spyOn(
                playerActionTargetSelect.stateMachine,
                "acceptPlayerInput"
            )
        })

        afterEach(() => {
            if (acceptPlayerInputSpy) acceptPlayerInputSpy.mockRestore()
        })

        it.each(mouseInputTests)(
            "$name",
            ({ createInputOnComponent, playerInputEvent }) => {
                createInputOnComponent(playerInputEvent)
                expect(acceptPlayerInputSpy).toHaveBeenCalledWith(
                    playerInputEvent
                )
            }
        )

        it.each(keyboardInputTests)(
            "$name",
            ({ createInputOnComponent, playerInputEvent }) => {
                createInputOnComponent(playerInputEvent)
                expect(acceptPlayerInputSpy).toHaveBeenCalledWith(
                    playerInputEvent
                )
            }
        )
    })
})
