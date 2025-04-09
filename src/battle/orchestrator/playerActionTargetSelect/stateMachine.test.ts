import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    PlayerActionTargetActionEnum,
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
    PlayerActionTargetTransitionEnum,
} from "./stateMachine"
import { StateMachineDataService } from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import {
    TargetingResults,
    TargetingResultsService,
} from "../../targeting/targetingService"
import { MapSearchTestUtils } from "../../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { MessageBoard } from "../../../message/messageBoard"
import { CampaignResourcesService } from "../../../campaign/campaignResources"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import {
    SummaryHUDState,
    SummaryHUDStateService,
} from "../../hud/summary/summaryHUD"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../../history/battleAction/battleActionRecorder"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { RandomNumberGenerator } from "../../numberGenerator/random"
import { MissionStatisticsService } from "../../missionStatistics/missionStatistics"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../battleOrchestratorComponent"
import { PlayerInputStateService } from "../../../ui/playerInput/playerInputState"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { PlayerDecisionHUDService } from "../../hud/playerActionPanel/playerDecisionHUD"
import {
    PlayerActionTargetContextService,
    PlayerActionTargetStateMachineContext,
} from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjectsService } from "./playerActionTargetStateMachineUIObjects"
import { Button } from "../../../ui/button/button"
import { ButtonLogicChangeOnRelease } from "../../../ui/button/logic/buttonLogicChangeOnRelease"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { TestButtonStyle } from "../../../ui/button/button.test"
import { RectAreaService } from "../../../ui/rectArea"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "../../orchestratorComponents/playerActionConfirm/okButton"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "../../orchestratorComponents/playerActionConfirm/cancelButton"
import { MouseButton } from "../../../utils/mouseConfig"

describe("PlayerActionTargetSelect State Machine", () => {
    let stateMachine: PlayerActionTargetStateMachine
    let objectRepository: ObjectRepository
    let actionTemplate: ActionTemplate
    let missionMap: MissionMap
    let context: PlayerActionTargetStateMachineContext
    let battleSquaddieId = "battleSquaddieId"
    let squaddieTemplateId = "squaddieTemplateId"
    let messageBoard: MessageBoard
    let battleActionDecisionStep: BattleActionDecisionStep
    let summaryHUDState: SummaryHUDState
    let battleActionRecorder: BattleActionRecorder
    let numberGenerator: NumberGeneratorStrategy
    let getButtonsSpy: MockInstance
    let confirmOKButton: Button
    let confirmCancelButton: Button

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "actionTemplate",
            actionEffectTemplates: [ActionEffectTemplateService.new({})],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            battleId: battleSquaddieId,
            templateId: squaddieTemplateId,
            name: "name",
            actionTemplateIds: [],
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository,
        })
        missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId,
            squaddieTemplateId,
            coordinate: { q: 0, r: 0 },
        })

        battleActionDecisionStep = BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: battleActionDecisionStep,
            battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })
        messageBoard = new MessageBoard()

        summaryHUDState = SummaryHUDStateService.new()
        battleActionRecorder = BattleActionRecorderService.new()
        numberGenerator = new RandomNumberGenerator()
        context = PlayerActionTargetContextService.new({
            objectRepository,
            missionMap,
            battleActionDecisionStep,
            messageBoard,
            battleActionRecorder,
            numberGenerator,
            playerInputState: PlayerInputStateService.newFromEnvironment(),
            summaryHUDState: summaryHUDState,
            campaignResources: CampaignResourcesService.default(),
            missionStatistics: MissionStatisticsService.new({}),
            playerConsideredActions: PlayerConsideredActionsService.new(),
            playerDecisionHUD: PlayerDecisionHUDService.new(),
        })

        stateMachine = new PlayerActionTargetStateMachine({
            id: "PlayerActionTargetStateMachine",
            context: context,
            stateMachineData: StateMachineDataService.new({
                initialState: PlayerActionTargetStateEnum.INITIALIZED,
                infoByState: PlayerActionTargetStateMachineInfoByState,
                infoByTransition:
                    PlayerActionTargetStateMachineInfoByTransition,
            }),
        })
        stateMachine.uiObjects =
            PlayerActionTargetStateMachineUIObjectsService.empty()
        confirmOKButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID,
            buttonLogic: new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            }),
            drawTask: new TestButtonStyle(
                DataBlobService.new(),
                RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 10,
                    height: 10,
                })
            ),
        })
        stateMachine.uiObjects.confirm.okButton = confirmOKButton
        confirmCancelButton = new Button({
            id: PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID,
            buttonLogic: new ButtonLogicChangeOnRelease({
                dataBlob: {
                    data: {},
                },
            }),
            drawTask: new TestButtonStyle(
                DataBlobService.new(),
                RectAreaService.new({
                    left: 100,
                    top: 100,
                    width: 10,
                    height: 10,
                })
            ),
        })
        stateMachine.uiObjects.confirm.cancelButton = confirmCancelButton
    })

    afterEach(() => {
        if (getButtonsSpy) getButtonsSpy.mockRestore()
    })

    describe("initialized state", () => {
        it("starts in initialized state", () => {
            expect(stateMachine.currentState).toEqual(
                PlayerActionTargetStateEnum.INITIALIZED
            )
        })
        it("will trigger the initialized trigger", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.INITIALIZED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.COUNT_TARGETS
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY,
            ])
        })
    })

    describe("COUNT_TARGETS_ENTRY action counts the number of valid targets found", () => {
        let findValidTargetsSpy: MockInstance
        let lotsOfTargets: TargetingResults

        beforeEach(() => {
            lotsOfTargets = new TargetingResults()
            ;[1, 2, 3].forEach((target) => {
                lotsOfTargets.addBattleSquaddieIdsInRange([`${target}`])
                const mapCoordinate = { q: 0, r: target }
                lotsOfTargets.addCoordinatesInRange([mapCoordinate])
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: `${target}`,
                    squaddieTemplateId: `${target}`,
                    coordinate: mapCoordinate,
                })
            })

            findValidTargetsSpy = vi
                .spyOn(TargetingResultsService, "findValidTargets")
                .mockReturnValue(lotsOfTargets)
        })

        afterEach(() => {
            if (findValidTargetsSpy) findValidTargetsSpy.mockRestore()
        })

        it("tries to calculate the valid targets", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(findValidTargetsSpy).toBeCalled()
        })

        it("maps the valid squaddies to their map coordinate", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(context.targetResults.validTargets).toEqual(
                expect.objectContaining({
                    "1": { mapCoordinate: { q: 0, r: 1 } },
                    "2": { mapCoordinate: { q: 0, r: 2 } },
                    "3": { mapCoordinate: { q: 0, r: 3 } },
                })
            )
        })

        it("stores the coordinates that are in range", () => {
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)

            expect(context.targetResults.validCoordinates).toEqual(
                expect.arrayContaining([
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                    { q: 0, r: 3 },
                ])
            )
        })

        describe("throw errors when data is missing", () => {
            it("throws an error if there is no actor", () => {
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: context.battleActionDecisionStep,
                    battleSquaddieId: undefined,
                })
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )(context)
                }).toThrow("no actor found")
            })
            it("throws an error if no action is set", () => {
                context.battleActionDecisionStep.action = undefined
                expect(() => {
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
                    )(context)
                }).toThrow("no action found")
            })
        })
    })

    describe("Unsupported number of targets found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {
                            "1": { mapCoordinate: { q: 0, r: 1 } },
                            "2": { mapCoordinate: { q: 0, r: 2 } },
                            "3": { mapCoordinate: { q: 0, r: 3 } },
                        }
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will fire an UNSUPPORTED_COUNT_TARGETS transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.NOT_APPLICABLE
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY,
            ])
        })
    })

    it("NOT_APPLICABLE_ENTRY action sets the use legacy selector flag", () => {
        stateMachine.getActionLogic(
            PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY
        )(context)

        expect(context.externalFlags.useLegacySelector).toBeTruthy()
    })

    describe("Transition to completed state", () => {
        it("will transition if the legacy selector should be used", () => {
            stateMachine.currentState =
                PlayerActionTargetStateEnum.NOT_APPLICABLE
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY
            )(context)

            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.FINISHED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.FINISHED
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.FINISHED_ENTRY,
            ])
        })
    })

    it("FINISHED_ENTRY action sets the completed flag", () => {
        stateMachine.getActionLogic(
            PlayerActionTargetActionEnum.FINISHED_ENTRY
        )(context)

        expect(context.externalFlags.finished).toBeTruthy()
    })

    describe("No targets found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {}
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will transition to cancel selections", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
            ])
        })
    })

    describe("One target found", () => {
        beforeEach(() => {
            StateMachineDataService.setActionLogic(
                stateMachine.stateMachineData,
                {
                    [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]: (
                        context: PlayerActionTargetStateMachineContext
                    ) => {
                        context.targetResults.validTargets = {
                            "1": { mapCoordinate: { q: 0, r: 1 } },
                        }
                    },
                }
            )
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY
            )(context)
            stateMachine.currentState =
                PlayerActionTargetStateEnum.COUNT_TARGETS
        })

        it("will fire the expected transition", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toEqual(
                PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED
            )
            expect(update.targetedState).toEqual(
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
            )
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED,
            ])
        })

        describe("running the trigger action", () => {
            let messageSpy: MockInstance
            beforeEach(() => {
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
                )(context)
            })
            it("sends messages indicating the target is known", () => {
                stateMachine.update()
                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                        battleActionRecorder,
                        numberGenerator,
                        missionMap,
                        battleActionDecisionStep,
                        summaryHUDState,
                        objectRepository,
                        targetCoordinate: { q: 0, r: 1 },
                    })
                )
            })
        })
    })

    describe("Waiting for Player to confirm", () => {
        beforeEach(() => {
            mockGetConfirmButtons()
            stateMachine.currentState =
                PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
            context.targetResults.validTargets = {
                "1": { mapCoordinate: { q: 0, r: 1 } },
            }
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
            )(context)
            stateMachine.getActionLogic(
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
            )(context)
        })

        it("will retrieve the confirm buttons", () => {
            expect(stateMachine.getConfirmButtons()).toEqual([
                confirmOKButton,
                confirmCancelButton,
            ])
        })

        it("does not transition while waiting for player input", () => {
            const update = stateMachine.update()
            expect(update.transitionFired).toBeUndefined()
            expect(update.actions).toEqual([
                PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM,
            ])
            expect(update.targetedState).toBeUndefined()
        })

        it("clears the player input after processing", () => {
            stateMachine.update()
            expect(context.playerInput).toHaveLength(0)
        })

        const mockGetConfirmButtons = () => {
            getButtonsSpy = vi.spyOn(stateMachine, "getConfirmButtons")
            return {
                okButton: confirmOKButton,
                cancelButton: confirmCancelButton,
            }
        }

        describe("player confirms", () => {
            let messageSpy: MockInstance

            const tests = [
                {
                    name: "player presses accept key",
                    acceptPlayerInput: () => {
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentKeyEventType.PRESSED,
                            keyCode: JSON.parse(
                                process.env.PLAYER_INPUT_ACCEPT
                            )[0]["press"],
                        })
                    },
                },
                {
                    name: "player presses and releases the ok button",
                    acceptPlayerInput: () => {
                        const okButtonArea = confirmOKButton.getArea()
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentMouseEventType.PRESS,
                            mousePress: {
                                x: RectAreaService.centerX(okButtonArea),
                                y: RectAreaService.centerY(okButtonArea),
                                button: MouseButton.ACCEPT,
                            },
                        })
                        stateMachine.acceptPlayerInput({
                            eventType:
                                OrchestratorComponentMouseEventType.RELEASE,
                            mouseRelease: {
                                x: RectAreaService.centerX(okButtonArea),
                                y: RectAreaService.centerY(okButtonArea),
                                button: MouseButton.ACCEPT,
                            },
                        })
                    },
                },
            ]

            beforeEach(() => {
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.update()
            })

            afterEach(() => {
                if (messageSpy) messageSpy.mockRestore()
                if (getButtonsSpy) getButtonsSpy.mockRestore()
            })

            it.each(tests)(
                "$name will trigger a transition",
                ({ acceptPlayerInput }) => {
                    acceptPlayerInput()
                    let update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })

                    update = stateMachine.update()
                    expect(update.transitionFired).toEqual(
                        PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION
                    )

                    expect(update.targetedState).toEqual(
                        PlayerActionTargetStateEnum.FINISHED
                    )
                    expect(update.actions).toEqual([
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION,
                        PlayerActionTargetActionEnum.FINISHED_ENTRY,
                    ])

                    expect(getButtonsSpy).toHaveBeenCalled()
                }
            )

            describe("TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION", () => {
                beforeEach(() => {
                    tests[0].acceptPlayerInput()
                    const update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION
                    )(context)
                })

                it("sends a message to confirm the action", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        battleActionRecorder:
                            context.messageParameters.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        missionStatistics:
                            context.messageParameters
                                .playerConfirmsActionMessageParameters
                                .missionStatistics,
                    })
                })

                it("resets player intent", () => {
                    expect(expectPlayerIntentToBeReset()).toBeTruthy()
                })
            })
        })

        const expectPlayerIntentToBeReset = () => {
            expect(stateMachine.context.playerIntent).toEqual({
                targetSelection: {
                    battleSquaddieIds: [],
                    automaticallySelected: false,
                },
                targetConfirmed: false,
                actionCancelled: false,
            })
            return true
        }

        const cancelTests = [
            {
                name: "player presses cancel key",
                acceptPlayerInput: () => {
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentKeyEventType.PRESSED,
                        keyCode: JSON.parse(process.env.PLAYER_INPUT_CANCEL)[0][
                            "press"
                        ],
                    })
                },
            },
            {
                name: "player clicks on the the cancel button",
                acceptPlayerInput: () => {
                    const cancelButtonArea = confirmCancelButton.getArea()
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.PRESS,
                        mousePress: {
                            x: RectAreaService.centerX(cancelButtonArea),
                            y: RectAreaService.centerY(cancelButtonArea),
                            button: MouseButton.ACCEPT,
                        },
                    })
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.RELEASE,
                        mouseRelease: {
                            x: RectAreaService.centerX(cancelButtonArea),
                            y: RectAreaService.centerY(cancelButtonArea),
                            button: MouseButton.ACCEPT,
                        },
                    })
                },
            },
            {
                name: "player clicks the cancel key",
                acceptPlayerInput: () => {
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.PRESS,
                        mousePress: {
                            x: 9001,
                            y: -9001,
                            button: MouseButton.CANCEL,
                        },
                    })
                    stateMachine.acceptPlayerInput({
                        eventType: OrchestratorComponentMouseEventType.RELEASE,
                        mouseRelease: {
                            x: -9001,
                            y: 9001,
                            button: MouseButton.CANCEL,
                        },
                    })
                },
            },
        ]

        describe("player cancels when targets were automatically set", () => {
            let messageSpy: MockInstance

            beforeEach(() => {
                stateMachine.currentState =
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
                context.targetResults.validTargets = {
                    "1": { mapCoordinate: { q: 0, r: 1 } },
                }
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED
                )(context)
                stateMachine.getActionLogic(
                    PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM
                )(context)
                messageSpy = vi.spyOn(context.messageBoard, "sendMessage")
                stateMachine.update()
            })

            afterEach(() => {
                if (messageSpy) messageSpy.mockRestore()
            })

            it.each(cancelTests)(
                "$name will trigger a transition",
                ({ acceptPlayerInput }) => {
                    acceptPlayerInput()
                    let update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })

                    update = stateMachine.update()
                    expect(update.transitionFired).toEqual(
                        PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION
                    )

                    expect(update.targetedState).toEqual(
                        PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION
                    )
                    expect(update.actions).toEqual([
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
                        PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
                    ])
                }
            )

            describe("trigger player cancels action selection", () => {
                beforeEach(() => {
                    cancelTests[0].acceptPlayerInput()
                    const update = stateMachine.update()
                    update.actions.forEach((action) => {
                        stateMachine.getActionLogic(action)(context)
                    })
                    stateMachine.getActionLogic(
                        PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION
                    )(context)
                })

                it("sends a message indicating the player unselected the targets", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters
                                .playerCancelsTargetSelectionMessageParameters
                                .campaignResources,
                    })
                })
                it("sends a message indicating the player unselected the action", () => {
                    expect(messageSpy).toHaveBeenCalledWith({
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        objectRepository: context.objectRepository,
                        battleActionRecorder:
                            context.messageParameters.battleActionRecorder,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        missionMap: context.missionMap,
                        playerConsideredActions:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerConsideredActions,
                        playerDecisionHUD:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerDecisionHUD,
                    })
                })
                it("resets player intent", () => {
                    expect(expectPlayerIntentToBeReset()).toBeTruthy()
                })
            })
        })
    })
})
