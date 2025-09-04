import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { SummaryHUDState, SummaryHUDStateService } from "../summary/summaryHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import * as mocks from "../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    END_TURN_NAME,
    PlayerCommandState,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import { MouseButton } from "../../../utils/mouseConfig"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { CampaignService } from "../../../campaign/campaign"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { ValidityCheckService } from "../../actionValidity/validityChecker"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { PopupWindow } from "../popupWindow/popupWindow"
import { TextGraphicalHandlingService } from "../../../utils/graphics/textGraphicalHandlingService"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { Healing } from "../../../squaddie/squaddieService"
import {
    ActionButton,
    ActionButtonService,
} from "../playerActionPanel/actionButton/actionButton"
import { PlayerInputStateService } from "../../../ui/playerInput/playerInputState"

describe("playerCommandHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let playerCommandState: PlayerCommandState
    let gameEngineState: GameEngineState
    let resourceHandler: ResourceHandler
    let validityCheckerSpy: MockInstance

    let actionNeedsTarget: ActionTemplate
    let actionAlsoNeedsTarget: ActionTemplate
    let actionHasAWarning: ActionTemplate
    let actionWillAlwaysBeDisabled: ActionTemplate

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        graphicsBuffer.textWidth = vi.fn().mockReturnValue(1)
        resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })
        gameEngineState = GameEngineStateService.new({
            resourceHandler,
            repository: objectRepository,
            campaign: CampaignService.default(),
        })
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new()

        actionNeedsTarget = ActionTemplateService.new({
            id: "actionNeedsTarget",
            name: "NeedsTarget",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 2,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionNeedsTarget
        )

        actionAlsoNeedsTarget = ActionTemplateService.new({
            id: "actionAlsoNeedsTarget",
            name: "AlsoNeedsTarget",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionAlsoNeedsTarget
        )

        actionHasAWarning = ActionTemplateService.new({
            id: "actionHasAWarning",
            name: "ActionHasAWarning",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionHasAWarning
        )

        actionWillAlwaysBeDisabled = ActionTemplateService.new({
            id: "WillAlwaysBeDisabled",
            name: "WillAlwaysBeDisabled",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                    },
                    healingDescriptions: {
                        [Healing.LOST_HIT_POINTS]: 1,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionWillAlwaysBeDisabled
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            battleId: "player",
            templateId: "player",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [
                actionNeedsTarget.id,
                actionAlsoNeedsTarget.id,
                actionWillAlwaysBeDisabled.id,
                actionHasAWarning.id,
            ],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy",
            battleId: "enemy",
            templateId: "enemy",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.ENEMY,
            actionTemplateIds: [],
        })

        validityCheckerSpy = vi
            .spyOn(ValidityCheckService, "calculateActionValidity")
            .mockReturnValue({
                [actionNeedsTarget.id]: {
                    isValid: true,
                    warning: false,
                    messages: [],
                },
                [actionAlsoNeedsTarget.id]: {
                    isValid: true,
                    warning: false,
                    messages: [],
                },
                [actionHasAWarning.id]: {
                    isValid: true,
                    warning: true,
                    messages: [],
                },
                [actionWillAlwaysBeDisabled.id]: {
                    isValid: false,
                    warning: false,
                    messages: ["blocked by test", "also blocked by test"],
                },
            })
    })

    afterEach(() => {
        validityCheckerSpy.mockRestore()
    })

    const selectPlayer = () => {
        summaryHUDState = SummaryHUDStateService.new()

        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: "player",
        })

        SummaryHUDStateService.createActorTiles({
            summaryHUDState,
            objectRepository,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            campaignResources: gameEngineState.campaign.resources,
        })

        SummaryHUDStateService.draw({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
            resourceHandler,
        })
        playerCommandState = summaryHUDState.playerCommandState
    }

    const clickActionButton = ({ buttonArea }: { buttonArea: RectArea }) => {
        return PlayerCommandStateService.mouseReleased({
            mouseRelease: {
                x: RectAreaService.centerX(buttonArea),
                y: RectAreaService.centerY(buttonArea),
                button: MouseButton.ACCEPT,
            },
            gameEngineState,
            playerCommandState,
        })
    }

    const pressKeyBoardToSelectActionButton = ({
        index,
    }: {
        index: number
    }) => {
        return PlayerCommandStateService.keyPressed({
            playerInputAction: PlayerInputStateService.numberToListIndex(index),
            gameEngineState,
            playerCommandState,
        })
    }

    const hoverOverActionButton = ({
        buttonArea,
    }: {
        buttonArea: RectArea
    }) => {
        return PlayerCommandStateService.mouseMoved({
            mouseLocation: {
                x: RectAreaService.centerX(buttonArea),
                y: RectAreaService.centerY(buttonArea),
            },
            gameEngineState,
            playerCommandState,
        })
    }

    describe("action buttons", () => {
        it("will draw one action button per action template and one more for end turn", () => {
            const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
            selectPlayer()
            const { squaddieTemplate: playerSquaddieTemplate } =
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        "player"
                    )
                )
            expect(actionButtonSpy).toBeCalledTimes(
                playerSquaddieTemplate.actionTemplateIds.length + 1
            )
            actionButtonSpy.mockRestore()
        })
        it("will only draw the selected action and hide other features", () => {
            selectPlayer()
            const selectedActionButton = findActionButtonByActionTemplateId(
                actionNeedsTarget.id
            )
            clickActionButton({
                buttonArea: selectedActionButton.uiObjects.buttonIcon.drawArea,
            })
            const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
            expect(actionButtonSpy).toBeCalledTimes(1)
            actionButtonSpy.mockRestore()
        })

        it("will draw disabled buttons with a faded decoration", () => {
            const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
            selectPlayer()
            const disabledButtonCalls = getAllDrawCallsForActionButton(
                actionButtonSpy,
                "WillAlwaysBeDisabled"
            )
            expect(disabledButtonCalls[0][0].disabled).toBeTruthy()
        })
        it("will draw buttons with warnings with a warning decoration", () => {
            const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
            selectPlayer()
            const disabledButtonCalls = getAllDrawCallsForActionButton(
                actionButtonSpy,
                "actionHasAWarning"
            )
            expect(disabledButtonCalls[0][0].warning).toBeTruthy()
        })
        it("will not draw other actions with a highlight once an action is selected", () => {
            selectPlayer()
            const selectedActionButton =
                findActionButtonByActionTemplateId("actionNeedsTarget")
            clickActionButton({
                buttonArea: selectedActionButton.uiObjects.buttonIcon.drawArea,
            })
            const disabledActionButton = findActionButtonByActionTemplateId(
                "WillAlwaysBeDisabled"
            )
            hoverOverActionButton({
                buttonArea: disabledActionButton.uiObjects.buttonIcon.drawArea,
            })
            const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
            const disabledButtonCalls = getAllDrawCallsForActionButton(
                actionButtonSpy,
                "WillAlwaysBeDisabled"
            )
            expect(
                disabledButtonCalls.every(
                    (calls) => calls[0].selected === false
                )
            ).toBeTruthy()
            const selectedActionButtonDrawCalls =
                getAllDrawCallsForActionButton(
                    actionButtonSpy,
                    playerCommandState.selectedActionTemplateId
                )
            expect(
                selectedActionButtonDrawCalls.some(
                    (calls) => calls[0].selected === true
                )
            ).toBeTruthy()
            actionButtonSpy.mockRestore()
        })

        describe("consider actions by hovering the mouse", () => {
            let messageSpy: MockInstance
            beforeEach(() => {
                messageSpy = vi.spyOn(
                    gameEngineState.messageBoard,
                    "sendMessage"
                )
            })

            afterEach(() => {
                messageSpy.mockRestore()
            })

            it("will consider an action when the user hovers over the action button", () => {
                selectPlayer()
                const disabledActionButton = findActionButtonByActionTemplateId(
                    "WillAlwaysBeDisabled"
                )
                hoverOverActionButton({
                    buttonArea:
                        disabledActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(playerCommandState.consideredActionTemplateId).toEqual(
                    "WillAlwaysBeDisabled"
                )
                expect(
                    expectActionButtonToBeDrawnWithSelectedDecorator(
                        "WillAlwaysBeDisabled"
                    )
                ).toBeTruthy()
            })
            it("will remember the last considered action when the user hovers away", () => {
                selectPlayer()
                const disabledActionButton = findActionButtonByActionTemplateId(
                    "WillAlwaysBeDisabled"
                )
                hoverOverActionButton({
                    buttonArea:
                        disabledActionButton.uiObjects.buttonIcon.drawArea,
                })
                PlayerCommandStateService.mouseMoved({
                    mouseLocation: {
                        x: -9001,
                        y: 9001,
                    },
                    gameEngineState,
                    playerCommandState,
                })
                expect(playerCommandState.consideredActionTemplateId).toEqual(
                    "WillAlwaysBeDisabled"
                )
                expect(
                    expectActionButtonToBeDrawnWithSelectedDecorator(
                        "WillAlwaysBeDisabled"
                    )
                ).toBeTruthy()
            })
            it("will send a message when the user considers an action", () => {
                selectPlayer()
                const actionNeedsTargetButton =
                    findActionButtonByActionTemplateId(actionNeedsTarget.id)
                hoverOverActionButton({
                    buttonArea:
                        actionNeedsTargetButton.uiObjects.buttonIcon.drawArea,
                })
                expect(messageSpy).toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                        useAction: {
                            actionTemplateId: actionNeedsTarget.id,
                            isEndTurn: false,
                        },
                    })
                )
            })
            it("will not send a message if the considered action is disabled", () => {
                selectPlayer()
                const disabledActionButton = findActionButtonByActionTemplateId(
                    actionWillAlwaysBeDisabled.id
                )
                hoverOverActionButton({
                    buttonArea:
                        disabledActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(messageSpy).not.toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    })
                )
            })
            it("will send a message to cancel consideration if a button was considered, but no button is hovered over", () => {
                selectPlayer()
                const actionNeedsTargetButton =
                    findActionButtonByActionTemplateId(actionNeedsTarget.id)
                hoverOverActionButton({
                    buttonArea:
                        actionNeedsTargetButton.uiObjects.buttonIcon.drawArea,
                })
                PlayerCommandStateService.mouseMoved({
                    mouseLocation: {
                        x: -9001,
                        y: 9001,
                    },
                    gameEngineState,
                    playerCommandState,
                })
                expect(messageSpy).toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                    })
                )
            })
            it("will not send a message to cancel consideration if no buttons were considered hovered over", () => {
                selectPlayer()
                PlayerCommandStateService.mouseMoved({
                    mouseLocation: {
                        x: -9001,
                        y: 9001,
                    },
                    gameEngineState,
                    playerCommandState,
                })
                expect(messageSpy).not.toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                    })
                )
            })
        })
        describe("selecting an action by mouse", () => {
            it("will select an action by clicking on it", () => {
                selectPlayer()
                const selectedActionButton = findActionButtonByActionTemplateId(
                    actionNeedsTarget.id
                )
                clickActionButton({
                    buttonArea:
                        selectedActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(
                    playerCommandState.playerSelectedSquaddieAction
                ).toBeTruthy()
                expect(playerCommandState.selectedActionTemplateId).toEqual(
                    selectedActionButton.actionTemplate.id
                )
            })
            it("will not select a disabled button", () => {
                selectPlayer()
                const disabledActionButton = findActionButtonByActionTemplateId(
                    "WillAlwaysBeDisabled"
                )
                clickActionButton({
                    buttonArea:
                        disabledActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(
                    playerCommandState.playerSelectedSquaddieAction
                ).toBeFalsy()
                expect(
                    playerCommandState.selectedActionTemplateId
                ).toBeUndefined()
            })
        })
        describe("selecting an action by keyboard", () => {
            it("will select an action by pressing the keyboard command that corresponds to it", () => {
                selectPlayer()
                const selectedActionButtonIndex =
                    getIndexForActionButtonByActionTemplateId(
                        actionNeedsTarget.id
                    )
                pressKeyBoardToSelectActionButton({
                    index: selectedActionButtonIndex,
                })
                expect(
                    playerCommandState.playerSelectedSquaddieAction
                ).toBeTruthy()
                expect(playerCommandState.selectedActionTemplateId).toEqual(
                    actionNeedsTarget.id
                )
            })
            it("will not select a disabled button", () => {
                selectPlayer()
                const disabledActionButtonIndex =
                    getIndexForActionButtonByActionTemplateId(
                        actionWillAlwaysBeDisabled.id
                    )
                pressKeyBoardToSelectActionButton({
                    index: disabledActionButtonIndex,
                })
                expect(
                    playerCommandState.playerSelectedSquaddieAction
                ).toBeFalsy()
                expect(
                    playerCommandState.selectedActionTemplateId
                ).toBeUndefined()
            })
        })
        describe("will pop up a message on a disabled button", () => {
            let messageSpy: MockInstance
            let textHandlingSpy: MockInstance
            beforeEach(() => {
                messageSpy = vi
                    .spyOn(gameEngineState.messageBoard, "sendMessage")
                    .mockReturnValue()
            })
            afterEach(() => {
                messageSpy.mockRestore()
                textHandlingSpy.mockRestore()
            })

            const tests = [
                {
                    name: "hover over the button with the mouse",
                    action: () => {
                        hoverOverActionButton({
                            buttonArea: findActionButtonByActionTemplateId(
                                actionWillAlwaysBeDisabled.id
                            ).uiObjects.buttonIcon.drawArea,
                        })
                    },
                },
                {
                    name: "select action using the keyboard",
                    action: () => {
                        const disabledActionButtonIndex =
                            getIndexForActionButtonByActionTemplateId(
                                actionWillAlwaysBeDisabled.id
                            )
                        pressKeyBoardToSelectActionButton({
                            index: disabledActionButtonIndex,
                        })
                    },
                },
            ]

            it.each(tests)(`$name`, ({ action }) => {
                selectPlayer()
                action()
                expect(playerCommandState.newInvalidPopup).not.toBeUndefined()

                textHandlingSpy = vi
                    .spyOn(
                        TextGraphicalHandlingService,
                        "calculateLengthOfLineOfText"
                    )
                    .mockReturnValue(5)
                PlayerCommandStateService.createQueuedPopupIfNeeded({
                    playerCommandState,
                    gameEngineState,
                    graphicsBuffer: undefined,
                })

                expect(messageSpy).toBeCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                        gameEngineState,
                    })
                )
                expect(textHandlingSpy).toBeCalled()
                expect(playerCommandState.newInvalidPopup).toBeUndefined()

                const popupWindow: PopupWindow =
                    messageSpy.mock.calls[0][0].popupWindow
                expect(popupWindow.coordinateSystem).toBe(
                    CoordinateSystem.SCREEN
                )
                expect(popupWindow.label.textBox.text).toBe(
                    `blocked by test\nalso blocked by test`
                )
            })
        })

        describe("End Turn Action", () => {
            it("will consider end turn by hovering the mouse over it", () => {
                selectPlayer()
                const endTurnActionButton =
                    findActionButtonByActionTemplateId(END_TURN_NAME)
                hoverOverActionButton({
                    buttonArea:
                        endTurnActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(playerCommandState.consideredActionTemplateId).toEqual(
                    END_TURN_NAME
                )
                expect(
                    expectActionButtonToBeDrawnWithSelectedDecorator(
                        END_TURN_NAME
                    )
                ).toBeTruthy()
            })
            it("will select end turn by clicking on the action", () => {
                selectPlayer()
                const endTurnActionButton =
                    findActionButtonByActionTemplateId(END_TURN_NAME)
                clickActionButton({
                    buttonArea:
                        endTurnActionButton.uiObjects.buttonIcon.drawArea,
                })
                expect(playerCommandState.playerSelectedEndTurn).toBeTruthy()
            })
        })
    })

    const findActionButtonByActionTemplateId = (
        actionTemplateId: string
    ): ActionButton => {
        return playerCommandState.actionButtons.find(
            (actionButton) =>
                actionButton.actionTemplate?.id === actionTemplateId ||
                actionButton.actionTemplateOverride?.name === actionTemplateId
        )
    }
    const getIndexForActionButtonByActionTemplateId = (
        actionTemplateId: string
    ): number => {
        const index = playerCommandState.actionButtons.findIndex(
            (actionButton) =>
                actionButton.actionTemplate?.id === actionTemplateId ||
                actionButton.actionTemplateOverride?.name === actionTemplateId
        )

        return index > -1 ? index : null
    }
    const getAllDrawCallsForActionButton = (
        actionButtonDrawSpy: MockInstance,
        actionTemplateId: string
    ) => {
        return actionButtonDrawSpy.mock.calls.filter(
            (args) =>
                args[0].actionButton.actionTemplate?.id === actionTemplateId ||
                args[0].actionButton.actionTemplateOverride?.name ===
                    actionTemplateId
        )
    }
    const expectActionButtonToBeDrawnWithSelectedDecorator = (
        actionTemplateId: string
    ) => {
        const actionButtonSpy = vi.spyOn(ActionButtonService, "draw")
        SummaryHUDStateService.draw({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
            resourceHandler,
        })
        const actionButtonDrawCalls = getAllDrawCallsForActionButton(
            actionButtonSpy,
            actionTemplateId
        )
        expect(
            actionButtonDrawCalls.some((calls) => calls[0].selected === true)
        ).toBeTruthy()
        actionButtonSpy.mockRestore()
        return true
    }
})
