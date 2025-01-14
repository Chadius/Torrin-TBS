import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SummaryHUDState } from "../summary/summaryHUD"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import {
    HEX_TILE_WIDTH,
    HUE_BY_SQUADDIE_AFFILIATION,
} from "../../../graphicsConstants"
import { MakeDecisionButton } from "../playerActionPanel/makeDecisionButton"
import { MouseButton } from "../../../utils/mouseConfig"
import { ActionTemplate } from "../../../action/template/actionTemplate"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { isValidValue } from "../../../utils/validityCheck"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import { ButtonStatus } from "../../../ui/button"
import { Label, LabelService } from "../../../ui/label"
import { RectangleHelper } from "../../../ui/rectangle"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ValidityCheckService } from "../../actionValidity/validityChecker"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    PlayerDecisionHUDService,
    PopupWindowType,
} from "../playerActionPanel/playerDecisionHUD"
import { TextHandlingService } from "../../../utils/graphics/textHandlingService"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    WARNING_POPUP_TEXT_CONSTANTS,
} from "../../../cutscene/dialogue/constants"
import { PopupWindowService } from "../popupWindow/popupWindow"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"

export enum PlayerCommandSelection {
    PLAYER_COMMAND_SELECTION_NONE = "PLAYER_COMMAND_SELECTION_NONE",
    PLAYER_COMMAND_SELECTION_ACTION = "PLAYER_COMMAND_SELECTION_ACTION",
    PLAYER_COMMAND_SELECTION_MOVE = "PLAYER_COMMAND_SELECTION_MOVE",
    PLAYER_COMMAND_SELECTION_END_TURN = "PLAYER_COMMAND_SELECTION_END_TURN",
}

export enum MoveButtonPurpose {
    HIDE = "HIDE",
    SHOW = "SHOW",
}

const DECISION_BUTTON_LAYOUT = {
    top: 12,
    leftSidePadding: 24,
    horizontalSpacePerButton: 16,
    verticalPadding: 16,
    width: 72,
    height: 72,
    verticalSpaceBetweenRows: 48,
    endTurnButtonFontSize: 16,
    moveButtonFontSize: 12,
}
const DECISION_BUTTON_LAYOUT_COLORS = {
    strokeSaturation: 85,
    strokeBrightness: 50,
    strokeWeight: 4,
    fillSaturation: 85,
    fillBrightness: 50,
    fillAlpha: 127,
    templateNameTextTopMargin: 4,
    templateNameFontSize: 12,
    templateNameFontColor: [0, 0, 192],
    infoTextTopMargin: 2,
    infoFontColor: [0, 0, 192 - 64],
}

const MOVE_AND_END_BUTTON_DISPLAY = {
    stroke: {
        saturation: 2,
        brightness: 80,
        weight: 4,
    },
    fill: {
        saturation: 5,
        brightness: 80,
    },
}

export interface PlayerCommandState {
    endTurnButtonLabel: Label
    moveButtonLabel: Label
    playerSelectedSquaddieAction: boolean
    selectedActionTemplateId: string
    playerSelectedEndTurn: boolean
    playerCommandWindow?: { area: RectArea }
    newInvalidPopup: {
        buttonArea: RectArea
        message: string
    }

    squaddieAffiliationHue: number
    actionButtons: MakeDecisionButton[]
    moveButton: {
        buttonArea: RectArea
        onClickAction: MoveButtonPurpose
        status: ButtonStatus
        hue: number
    }
    endTurnButton: {
        buttonArea: RectArea
        status: ButtonStatus
        hue: number
    }
}

export const PlayerCommandStateService = {
    new: (): PlayerCommandState => {
        return {
            newInvalidPopup: undefined,
            playerSelectedSquaddieAction: false,
            selectedActionTemplateId: undefined,
            playerSelectedEndTurn: false,
            actionButtons: [],
            moveButton: undefined,
            moveButtonLabel: undefined,
            endTurnButton: undefined,
            endTurnButtonLabel: undefined,
            squaddieAffiliationHue:
                HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
        }
    },
    createCommandWindow: ({
        playerCommandState,
        summaryHUDState,
        objectRepository,
        gameEngineState,
        battleSquaddieId,
    }: {
        playerCommandState: PlayerCommandState
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        gameEngineState: GameEngineState
        battleSquaddieId: string
    }) => {
        playerCommandState.playerCommandWindow = {
            area: getPlayerCommandWindowAreaBasedOnMouse(
                {
                    x: summaryHUDState.screenSelectionCoordinates.x,
                    y: summaryHUDState.screenSelectionCoordinates.y,
                },
                objectRepository,
                gameEngineState
            ),
        }

        createButtons({
            playerCommandState: summaryHUDState.playerCommandState,
            gameEngineState,
            objectRepository,
            battleSquaddieId,
        })
    },
    mouseClicked: ({
        mouseX,
        mouseY,
        mouseButton,
        playerCommandState,
    }: {
        mouseX: number
        mouseButton: MouseButton
        mouseY: number
        playerCommandState: PlayerCommandState
    }): PlayerCommandSelection => {
        if (!isValidValue(playerCommandState)) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        if (mouseButton !== MouseButton.ACCEPT) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        if (
            RectAreaService.isInside(
                playerCommandState.moveButton.buttonArea,
                mouseX,
                mouseY
            )
        ) {
            if (
                playerCommandState.moveButton.status === ButtonStatus.DISABLED
            ) {
                return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
            }
            mouseClickedOnMoveButton(playerCommandState)
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE
        }

        if (isCommandWindowHidden(playerCommandState)) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        if (
            RectAreaService.isInside(
                playerCommandState.endTurnButton.buttonArea,
                mouseX,
                mouseY
            )
        ) {
            mouseClickedOnEndTurnButton({
                playerCommandState,
            })
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN
        }

        const actionButtonClicked = playerCommandState.actionButtons.find(
            (button) =>
                RectAreaService.isInside(
                    button.buttonIcon.drawArea,
                    mouseX,
                    mouseY
                )
        )
        if (!actionButtonClicked) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        if (actionButtonClicked.status === ButtonStatus.DISABLED) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        return mouseClickedOnActionButton({
            playerCommandState,
            actionButtonClicked,
        })
    },
    mouseMoved: ({
        mouseX,
        mouseY,
        gameEngineState,
        playerCommandState,
    }: {
        mouseX: number
        mouseY: number
        gameEngineState: GameEngineState
        playerCommandState: PlayerCommandState
    }): void => {
        if (!isValidValue(playerCommandState)) {
            return
        }

        const calculateNewButtonStatus = (button: {
            buttonArea: RectArea
            status: ButtonStatus
        }): ButtonStatus => {
            const isMouseInsideButton = RectAreaService.isInside(
                button.buttonArea,
                mouseX,
                mouseY
            )

            switch (true) {
                case button.status === ButtonStatus.HOVER &&
                    !isMouseInsideButton:
                    button.status = ButtonStatus.ACTIVE
                    return button.status
                case button.status === ButtonStatus.ACTIVE &&
                    isMouseInsideButton:
                    return ButtonStatus.HOVER
                default:
                    return button.status
            }
        }

        const clearPopupWindowWhenChangingToHover = (button: {
            buttonArea: RectArea
            currentStatus: ButtonStatus
            newStatus: ButtonStatus
        }) => {
            if (
                button.newStatus !== ButtonStatus.HOVER ||
                button.currentStatus === button.newStatus
            ) {
                return
            }

            PlayerDecisionHUDService.clearPopupWindow(
                gameEngineState.battleOrchestratorState.playerDecisionHUD,
                PopupWindowType.PLAYER_INVALID_SELECTION
            )
        }

        const showDisabledButtonExplanationIfHoveringOver = (button: {
            buttonArea: RectArea
            status: ButtonStatus
            popupMessage: string
        }) => {
            const isMouseInsideButton = RectAreaService.isInside(
                button.buttonArea,
                mouseX,
                mouseY
            )

            if (
                button.status === ButtonStatus.DISABLED &&
                isMouseInsideButton &&
                button.popupMessage
            ) {
                playerCommandState.newInvalidPopup = {
                    buttonArea: button.buttonArea,
                    message: button.popupMessage,
                }
            }
        }

        playerCommandState.actionButtons.forEach((button) => {
            const newButtonStatus = calculateNewButtonStatus({
                buttonArea: button.buttonIcon.drawArea,
                status: button.status,
            })

            clearPopupWindowWhenChangingToHover({
                buttonArea: button.buttonIcon.drawArea,
                currentStatus: button.status,
                newStatus: newButtonStatus,
            })

            showDisabledButtonExplanationIfHoveringOver({
                buttonArea: button.buttonIcon.drawArea,
                status: button.status,
                popupMessage: button.popupMessage,
            })

            button.status = newButtonStatus
        })
        ;[
            playerCommandState.moveButton,
            playerCommandState.endTurnButton,
        ].forEach((button) => {
            const newButtonStatus = calculateNewButtonStatus({
                buttonArea: button.buttonArea,
                status: button.status,
            })

            clearPopupWindowWhenChangingToHover({
                buttonArea: button.buttonArea,
                currentStatus: button.status,
                newStatus: newButtonStatus,
            })

            button.status = newButtonStatus
        })
    },
    draw({
        playerCommandState,
        graphicsBuffer,
        gameEngineState,
        resourceHandler,
    }: {
        playerCommandState: PlayerCommandState
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
        resourceHandler: ResourceHandler
    }) {
        createQueuedPopupIfNeeded(
            playerCommandState,
            graphicsBuffer,
            gameEngineState
        )

        drawMoveButton(playerCommandState, graphicsBuffer)

        if (isCommandWindowHidden(playerCommandState)) {
            return
        }

        playerCommandState.actionButtons.forEach((button) => {
            button.draw({
                objectRepository: gameEngineState.repository,
                graphicsContext: graphicsBuffer,
                resourceHandler,
            })
        })

        drawEndTurnButton(playerCommandState, graphicsBuffer)
    },
    createQueuedPopupIfNeeded: ({
        playerCommandState,
        graphicsBuffer,
        gameEngineState,
    }: {
        playerCommandState: PlayerCommandState
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
    }) =>
        createQueuedPopupIfNeeded(
            playerCommandState,
            graphicsBuffer,
            gameEngineState
        ),
}

const getPlayerCommandWindowAreaBasedOnMouse = (
    mouseSelectionLocation: {
        x: number
        y: number
    },
    objectRepository: ObjectRepository,
    gameEngineState: GameEngineState
): RectArea => {
    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        )
    )

    let playerCommandWindowArea = RectAreaService.new({
        top: mouseSelectionLocation.y,
        left: mouseSelectionLocation.x,
        width:
            (squaddieTemplate.actionTemplateIds.length + 1) *
            (DECISION_BUTTON_LAYOUT.width +
                DECISION_BUTTON_LAYOUT.horizontalSpacePerButton),
        height:
            DECISION_BUTTON_LAYOUT.verticalPadding +
            DECISION_BUTTON_LAYOUT.height +
            DECISION_BUTTON_LAYOUT.verticalSpaceBetweenRows +
            DECISION_BUTTON_LAYOUT.height +
            DECISION_BUTTON_LAYOUT.verticalPadding,
    })

    switch (true) {
        case playerCommandWindowArea.left < HEX_TILE_WIDTH:
            playerCommandWindowArea.left = HEX_TILE_WIDTH
            break
        case mouseSelectionLocation.x < ScreenDimensions.SCREEN_WIDTH / 2:
        case mouseSelectionLocation.x >= ScreenDimensions.SCREEN_WIDTH / 2:
            playerCommandWindowArea.left =
                mouseSelectionLocation.x - HEX_TILE_WIDTH
            break
    }

    if (
        RectAreaService.right(playerCommandWindowArea) >
        ScreenDimensions.SCREEN_WIDTH - HEX_TILE_WIDTH
    ) {
        RectAreaService.setRight(
            playerCommandWindowArea,
            ScreenDimensions.SCREEN_WIDTH - HEX_TILE_WIDTH
        )
    }

    if (
        mouseSelectionLocation.y +
            HEX_TILE_WIDTH +
            playerCommandWindowArea.height >
        ScreenDimensions.SCREEN_HEIGHT
    ) {
        RectAreaService.setBottom(
            playerCommandWindowArea,
            ScreenDimensions.SCREEN_HEIGHT
        )
        return playerCommandWindowArea
    }

    playerCommandWindowArea.top = mouseSelectionLocation.y + HEX_TILE_WIDTH

    return playerCommandWindowArea
}

const createButtons = ({
    playerCommandState,
    objectRepository,
    gameEngineState,
    battleSquaddieId,
}: {
    playerCommandState: PlayerCommandState
    objectRepository: ObjectRepository
    gameEngineState: GameEngineState
    battleSquaddieId: string
}) => {
    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )
    playerCommandState.squaddieAffiliationHue =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    createButtonsForFirstRow({
        playerCommandState,
        objectRepository,
        gameEngineState,
        battleSquaddieId,
    })
    createButtonsForSecondRow({
        playerCommandState,
        objectRepository,
        battleSquaddieId,
    })
}

const updateMoveButtonText = (playerCommandState: PlayerCommandState) => {
    const text: string = isCommandWindowHidden(playerCommandState)
        ? "Click to Show\n\nClick Map\n to Move"
        : "Click to Hide\n\nClick Map\n to Move"

    playerCommandState.moveButtonLabel = LabelService.new({
        textBoxMargin: 0,
        text,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
        fontSize: DECISION_BUTTON_LAYOUT.moveButtonFontSize,
        fontColor: [0, 0, 0],
        area: playerCommandState.moveButton.buttonArea,
        fillColor: [
            playerCommandState.squaddieAffiliationHue,
            MOVE_AND_END_BUTTON_DISPLAY.fill.saturation,
            MOVE_AND_END_BUTTON_DISPLAY.fill.brightness,
        ],
        strokeColor: [
            playerCommandState.squaddieAffiliationHue,
            MOVE_AND_END_BUTTON_DISPLAY.stroke.saturation,
            MOVE_AND_END_BUTTON_DISPLAY.stroke.brightness,
        ],
        strokeWeight: MOVE_AND_END_BUTTON_DISPLAY.stroke.weight,
    })
}

const createButtonsForFirstRow = ({
    playerCommandState,
    objectRepository,
    gameEngineState,
    battleSquaddieId,
}: {
    playerCommandState: PlayerCommandState
    objectRepository: ObjectRepository
    gameEngineState: GameEngineState
    battleSquaddieId: string
}) => {
    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )

    const defaultButtonIconResourceKey =
        gameEngineState.campaign.resources
            .actionEffectSquaddieTemplateButtonIcons.UNKNOWN

    playerCommandState.moveButton = {
        buttonArea: RectAreaService.new({
            left: playerCommandState.playerCommandWindow.area.left,
            top:
                playerCommandState.playerCommandWindow.area.top +
                DECISION_BUTTON_LAYOUT.verticalPadding,
            width: DECISION_BUTTON_LAYOUT.width,
            height: DECISION_BUTTON_LAYOUT.height,
        }),
        hue: playerCommandState.squaddieAffiliationHue,
        onClickAction: MoveButtonPurpose.HIDE,
        status: ButtonStatus.ACTIVE,
    }
    updateMoveButtonText(playerCommandState)

    const statusForTheActionButton =
        ValidityCheckService.calculateActionValidity({
            objectRepository,
            battleSquaddieId,
            gameEngineState,
        })

    playerCommandState.actionButtons = squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(
                gameEngineState.repository,
                id
            )
        )
        .map((actionTemplate: ActionTemplate, index: number) => {
            const popupMessage: string =
                statusForTheActionButton[actionTemplate.id]?.messages.join(
                    "\n"
                ) ?? ""

            const button = new MakeDecisionButton({
                buttonArea: RectAreaService.new({
                    left:
                        playerCommandState.playerCommandWindow.area.left +
                        (index + 1) *
                            (DECISION_BUTTON_LAYOUT.width +
                                DECISION_BUTTON_LAYOUT.horizontalSpacePerButton),
                    top:
                        playerCommandState.playerCommandWindow.area.top +
                        DECISION_BUTTON_LAYOUT.verticalPadding,
                    width: DECISION_BUTTON_LAYOUT.width,
                    height: DECISION_BUTTON_LAYOUT.height,
                }),
                actionTemplateId: actionTemplate.id,
                buttonIconResourceKey: isValidValue(
                    actionTemplate.buttonIconResourceKey
                )
                    ? actionTemplate.buttonIconResourceKey
                    : defaultButtonIconResourceKey,
                hue: playerCommandState.squaddieAffiliationHue,
                popupMessage,
            })

            button.status = ButtonStatus.ACTIVE
            if (statusForTheActionButton[actionTemplate.id]?.disabled) {
                button.status = ButtonStatus.DISABLED
            }
            return button
        })
}

const createButtonsForSecondRow = ({
    playerCommandState,
    objectRepository,
    battleSquaddieId,
}: {
    playerCommandState: PlayerCommandState
    objectRepository: ObjectRepository
    battleSquaddieId: string
}) => {
    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    playerCommandState.endTurnButton = {
        buttonArea: RectAreaService.new({
            left:
                playerCommandState.playerCommandWindow.area.left +
                DECISION_BUTTON_LAYOUT.horizontalSpacePerButton,
            top:
                playerCommandState.playerCommandWindow.area.top +
                DECISION_BUTTON_LAYOUT.verticalPadding +
                DECISION_BUTTON_LAYOUT.height +
                DECISION_BUTTON_LAYOUT.verticalSpaceBetweenRows,
            width:
                DECISION_BUTTON_LAYOUT.width *
                Math.min(2, squaddieTemplate.actionTemplateIds.length + 1),
            height: DECISION_BUTTON_LAYOUT.height / 2,
        }),
        hue: squaddieAffiliationHue,
        status: ButtonStatus.ACTIVE,
    }

    playerCommandState.endTurnButtonLabel = LabelService.new({
        textBoxMargin: 0,
        text: "End Turn",
        fontSize: DECISION_BUTTON_LAYOUT.endTurnButtonFontSize,
        fontColor: [0, 0, 0],
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
        area: playerCommandState.endTurnButton.buttonArea,
        fillColor: [
            playerCommandState.squaddieAffiliationHue,
            MOVE_AND_END_BUTTON_DISPLAY.fill.saturation,
            MOVE_AND_END_BUTTON_DISPLAY.fill.brightness,
        ],
        strokeColor: [
            playerCommandState.squaddieAffiliationHue,
            MOVE_AND_END_BUTTON_DISPLAY.stroke.saturation,
            MOVE_AND_END_BUTTON_DISPLAY.stroke.brightness,
        ],
        strokeWeight: MOVE_AND_END_BUTTON_DISPLAY.stroke.weight,
    })
}

const isCommandWindowHidden = (playerCommandState: PlayerCommandState) =>
    playerCommandState.moveButton.onClickAction === MoveButtonPurpose.SHOW

const mouseClickedOnMoveButton = (playerCommandState: PlayerCommandState) => {
    if (!isCommandWindowHidden(playerCommandState)) {
        playerCommandState.moveButton.onClickAction = MoveButtonPurpose.SHOW
        updateMoveButtonText(playerCommandState)
        return
    }
    playerCommandState.moveButton.onClickAction = MoveButtonPurpose.HIDE
    updateMoveButtonText(playerCommandState)
}

const mouseClickedOnEndTurnButton = ({
    playerCommandState,
}: {
    playerCommandState: PlayerCommandState
}) => {
    playerCommandState.playerSelectedEndTurn = true
    playerCommandState.playerSelectedSquaddieAction = false
    playerCommandState.selectedActionTemplateId = undefined
}

const mouseClickedOnActionButton = ({
    playerCommandState,
    actionButtonClicked,
}: {
    playerCommandState: PlayerCommandState
    actionButtonClicked: MakeDecisionButton
}): PlayerCommandSelection => {
    playerCommandState.playerSelectedEndTurn = false
    playerCommandState.playerSelectedSquaddieAction = true
    playerCommandState.selectedActionTemplateId =
        actionButtonClicked.actionTemplateId
    return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
}

const drawMoveButton = (
    playerCommandState: PlayerCommandState,
    graphicsBuffer: GraphicsBuffer
) => {
    LabelService.draw(playerCommandState.moveButtonLabel, graphicsBuffer)

    if (playerCommandState.moveButton.status === ButtonStatus.HOVER) {
        const hoverOutline = RectangleHelper.new({
            area: playerCommandState.moveButton.buttonArea,
            strokeColor: [
                playerCommandState.moveButton.hue,
                DECISION_BUTTON_LAYOUT_COLORS.strokeSaturation,
                DECISION_BUTTON_LAYOUT_COLORS.strokeBrightness,
            ],
            fillColor: [
                playerCommandState.moveButton.hue,
                DECISION_BUTTON_LAYOUT_COLORS.fillSaturation,
                DECISION_BUTTON_LAYOUT_COLORS.fillBrightness,
                DECISION_BUTTON_LAYOUT_COLORS.fillAlpha,
            ],
            strokeWeight: DECISION_BUTTON_LAYOUT_COLORS.strokeWeight,
        })

        RectangleHelper.draw(hoverOutline, graphicsBuffer)
    }
}

const drawEndTurnButton = (
    playerCommandState: PlayerCommandState,
    graphicsBuffer: GraphicsBuffer
) => {
    LabelService.draw(playerCommandState.endTurnButtonLabel, graphicsBuffer)
    if (playerCommandState.endTurnButton.status === ButtonStatus.HOVER) {
        const hoverOutline = RectangleHelper.new({
            area: playerCommandState.endTurnButton.buttonArea,
            strokeColor: [
                playerCommandState.endTurnButton.hue,
                DECISION_BUTTON_LAYOUT_COLORS.strokeSaturation,
                DECISION_BUTTON_LAYOUT_COLORS.strokeBrightness,
            ],
            fillColor: [
                playerCommandState.endTurnButton.hue,
                DECISION_BUTTON_LAYOUT_COLORS.fillSaturation,
                DECISION_BUTTON_LAYOUT_COLORS.fillBrightness,
                DECISION_BUTTON_LAYOUT_COLORS.fillAlpha,
            ],
            strokeWeight: DECISION_BUTTON_LAYOUT_COLORS.strokeWeight,
        })

        RectangleHelper.draw(hoverOutline, graphicsBuffer)
    }
}

const createQueuedPopupIfNeeded = (
    playerCommandState: PlayerCommandState,
    graphicsBuffer: GraphicsBuffer,
    gameEngineState: GameEngineState
) => {
    if (!playerCommandState.newInvalidPopup) {
        return
    }
    const windowWidth: number = TextHandlingService.calculateLengthOfLineOfText(
        {
            text: playerCommandState.newInvalidPopup.message,
            fontSize: DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSize,
            strokeWeight:
                DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.strokeWeight,
            graphicsContext: graphicsBuffer,
        }
    )
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
        gameEngineState,
        popupWindow: PopupWindowService.new({
            coordinateSystem: CoordinateSystem.SCREEN,
            label: LabelService.new({
                fontSize: DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSize,
                fontColor:
                    DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontColor,
                textBoxMargin: WARNING_POPUP_TEXT_CONSTANTS.label.textBoxMargin,
                fillColor: WARNING_POPUP_TEXT_CONSTANTS.label.fillColor,
                text: playerCommandState.newInvalidPopup.message,
                area: RectAreaService.new({
                    centerX: RectAreaService.left(
                        playerCommandState.newInvalidPopup.buttonArea
                    ),
                    top:
                        RectAreaService.bottom(
                            playerCommandState.newInvalidPopup.buttonArea
                        ) + WINDOW_SPACING.SPACING1,
                    width: windowWidth,
                    height: WARNING_POPUP_TEXT_CONSTANTS.minHeight,
                }),
            }),
        }),
    })
    playerCommandState.newInvalidPopup = undefined
}
