import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SummaryHUDState } from "../summary/summaryHUD"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import {
    MouseButton,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { ActionTemplate } from "../../../action/template/actionTemplate"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { WINDOW_SPACING } from "../../../ui/constants"
import { LabelService } from "../../../ui/label"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    ActionValidityStatus,
    ValidityCheckService,
} from "../../actionValidity/validityChecker"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { TextHandlingService } from "../../../utils/graphics/textHandlingService"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    WARNING_POPUP_TEXT_CONSTANTS,
} from "../../../cutscene/dialogue/constants"
import { PopupWindowService } from "../popupWindow/popupWindow"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import {
    ActionButton,
    ActionButtonService,
} from "../playerActionPanel/actionButton/actionButton"
import { SquaddieNameAndPortraitTileService } from "../playerActionPanel/tile/squaddieNameAndPortraitTile"
import { ActionTilePosition } from "../playerActionPanel/tile/actionTilePosition"

export const END_TURN_NAME = "END TURN"

export enum PlayerCommandSelection {
    PLAYER_COMMAND_SELECTION_NONE = "PLAYER_COMMAND_SELECTION_NONE",
    PLAYER_COMMAND_SELECTION_ACTION = "PLAYER_COMMAND_SELECTION_ACTION",
    PLAYER_COMMAND_SELECTION_MOVE = "PLAYER_COMMAND_SELECTION_MOVE",
    PLAYER_COMMAND_SELECTION_END_TURN = "PLAYER_COMMAND_SELECTION_END_TURN",
}

export interface PlayerCommandState {
    consideredActionTemplateId: string
    playerSelectedSquaddieAction: boolean
    selectedActionTemplateId: string
    playerSelectedEndTurn: boolean
    battleSquaddieId: string
    newInvalidPopup: {
        buttonArea: RectArea
        message: string
    }

    squaddieAffiliationHue: number
    actionButtons: ActionButton[]
}

export const PlayerCommandStateService = {
    new: (): PlayerCommandState => {
        return {
            consideredActionTemplateId: undefined,
            newInvalidPopup: undefined,
            playerSelectedSquaddieAction: false,
            selectedActionTemplateId: undefined,
            playerSelectedEndTurn: false,
            battleSquaddieId: undefined,
            actionButtons: [],
            squaddieAffiliationHue:
                HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
        }
    },
    createCommandWindow: ({
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
        summaryHUDState.playerCommandState.battleSquaddieId = battleSquaddieId
        createActionButtons({
            playerCommandState: summaryHUDState.playerCommandState,
            gameEngineState,
            objectRepository,
            battleSquaddieId,
        })
    },
    mouseReleased: ({
        mouseRelease,
        gameEngineState,
        playerCommandState,
    }: {
        mouseRelease: MouseRelease
        gameEngineState: GameEngineState
        playerCommandState: PlayerCommandState
    }): PlayerCommandSelection => {
        if (!isValidValue(playerCommandState)) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        if (mouseRelease.button !== MouseButton.ACCEPT) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        let actionButtonClicked = playerCommandState.actionButtons.find(
            (actionButton) =>
                ActionButtonService.shouldSelectActionBecauseOfMouseButton(
                    actionButton,
                    mouseRelease
                )
        )

        if (isActionButtonEndTurn(actionButtonClicked)) {
            return mouseClickedOnEndTurnButton({
                playerCommandState,
            })
        }

        const actionValidity = ValidityCheckService.calculateActionValidity({
            objectRepository: gameEngineState.repository,
            battleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            gameEngineState,
        })
        if (
            actionButtonClicked &&
            actionValidity[actionButtonClicked.actionTemplate.id]?.isValid
        ) {
            return mouseClickedOnActionButton({
                playerCommandState,
                actionTemplateId: actionButtonClicked.actionTemplate.id,
            })
        }
        return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
    },
    mouseMoved: ({
        mouseLocation,
        gameEngineState,
        playerCommandState,
    }: {
        mouseLocation: ScreenLocation
        gameEngineState: GameEngineState
        playerCommandState: PlayerCommandState
    }): void => {
        if (!isValidValue(playerCommandState)) {
            return
        }

        if (playerCommandState.selectedActionTemplateId) return

        let battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId
        const actionValidity = ValidityCheckService.calculateActionValidity({
            objectRepository: gameEngineState.repository,
            battleSquaddieId: battleSquaddieId,
            gameEngineState,
        })

        const consideredActionButton = playerCommandState.actionButtons.find(
            (actionButton) =>
                ActionButtonService.shouldConsiderActionBecauseOfMouseMovement(
                    actionButton,
                    mouseLocation
                )
        )

        if (
            !consideredActionButton &&
            playerCommandState.consideredActionTemplateId
        ) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
                gameEngineState,
                useAction: {
                    actionTemplateId: undefined,
                    isEndTurn: false,
                },
                cancelAction: {
                    actionTemplate: undefined,
                },
            })
            return
        }

        if (!consideredActionButton) return

        playerCommandState.consideredActionTemplateId =
            ActionButtonService.getActionTemplateId(consideredActionButton)

        if (
            actionValidity[playerCommandState.consideredActionTemplateId]
                ?.messages.length > 0
        ) {
            playerCommandState.newInvalidPopup = {
                buttonArea:
                    consideredActionButton.uiObjects.buttonIcon.drawArea,
                message:
                    actionValidity[
                        playerCommandState.consideredActionTemplateId
                    ].messages.join("\n"),
            }
        }

        if (
            !actionValidity[playerCommandState.consideredActionTemplateId]
                ?.isValid
        ) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
            gameEngineState,
            useAction: {
                actionTemplateId: isActionButtonEndTurn(consideredActionButton)
                    ? undefined
                    : consideredActionButton.actionTemplate.id,
                isEndTurn: isActionButtonEndTurn(consideredActionButton),
            },
        })
    },
    draw({
        playerCommandState,
        graphicsBuffer,
        gameEngineState,
        resourceHandler,
        showOnlySelectedActionButton,
    }: {
        playerCommandState: PlayerCommandState
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
        resourceHandler: ResourceHandler
        showOnlySelectedActionButton: boolean
    }) {
        createQueuedPopupIfNeeded(
            playerCommandState,
            graphicsBuffer,
            gameEngineState
        )

        if (
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ) == undefined
        )
            return

        const actionValidity = ValidityCheckService.calculateActionValidity({
            objectRepository: gameEngineState.repository,
            battleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            gameEngineState,
        })

        drawActionButtons({
            actionButtons: playerCommandState.actionButtons,
            graphicsBuffer: graphicsBuffer,
            resourceHandler: resourceHandler,
            actionValidity,
            consideredActionTemplateId:
                playerCommandState.consideredActionTemplateId,
            selectedActionTemplateId:
                playerCommandState.selectedActionTemplateId,
            showOnlySelectedActionButton,
        })
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

const isActionButtonEndTurn = (actionButtonClicked: ActionButton) =>
    actionButtonClicked?.actionTemplateOverride?.name === END_TURN_NAME

const mouseClickedOnEndTurnButton = ({
    playerCommandState,
}: {
    playerCommandState: PlayerCommandState
}) => {
    playerCommandState.playerSelectedEndTurn = true
    playerCommandState.playerSelectedSquaddieAction = false
    playerCommandState.selectedActionTemplateId = undefined
    return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN
}

const mouseClickedOnActionButton = ({
    playerCommandState,
    actionTemplateId,
}: {
    playerCommandState: PlayerCommandState
    actionTemplateId: string
}): PlayerCommandSelection => {
    playerCommandState.playerSelectedEndTurn = false
    playerCommandState.playerSelectedSquaddieAction = true
    playerCommandState.selectedActionTemplateId = actionTemplateId
    playerCommandState.consideredActionTemplateId = actionTemplateId
    return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
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

const createActionButtons = ({
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

    const defaultButtonIconResourceKey =
        gameEngineState.campaign.resources
            .actionEffectSquaddieTemplateButtonIcons.UNKNOWN

    const actionTileBoundingBox =
        SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
            ActionTilePosition.ACTION_PREVIEW
        )

    playerCommandState.actionButtons = squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(
                gameEngineState.repository,
                id
            )
        )
        .map((actionTemplate: ActionTemplate) =>
            ActionButtonService.new({
                actionTemplateId: actionTemplate.id,
                objectRepository,
                buttonArea: RectAreaService.new({
                    left: RectAreaService.left(actionTileBoundingBox),
                    bottom:
                        RectAreaService.top(actionTileBoundingBox) -
                        10 -
                        WINDOW_SPACING.SPACING1,
                    width: 64,
                    height: 64,
                }),
                defaultButtonIconResourceKey,
            })
        )

    playerCommandState.actionButtons.push(
        ActionButtonService.new({
            actionTemplateId: undefined,
            objectRepository,
            buttonArea: RectAreaService.new({
                left: RectAreaService.left(actionTileBoundingBox),
                bottom:
                    RectAreaService.top(actionTileBoundingBox) -
                    10 -
                    WINDOW_SPACING.SPACING1,
                width: 48,
                height: 48,
            }),
            defaultButtonIconResourceKey,
            actionTemplateOverride: {
                name: END_TURN_NAME,
                buttonIconResourceKey:
                    gameEngineState.campaign.resources.endTurnIconResourceKey,
            },
        })
    )
}

const drawActionButtons = ({
    actionButtons,
    graphicsBuffer,
    resourceHandler,
    actionValidity,
    consideredActionTemplateId,
    selectedActionTemplateId,
    showOnlySelectedActionButton,
}: {
    actionButtons: ActionButton[]
    graphicsBuffer: GraphicsBuffer
    resourceHandler: ResourceHandler
    actionValidity: { [_: string]: ActionValidityStatus }
    consideredActionTemplateId?: string
    selectedActionTemplateId?: string
    showOnlySelectedActionButton: boolean
}) => {
    actionButtons.forEach((actionButton, index) => {
        const actionIsSelected: boolean = actionButton.actionTemplate
            ? selectedActionTemplateId === actionButton.actionTemplate.id
            : actionButton.actionTemplateOverride.name ===
              selectedActionTemplateId

        if (showOnlySelectedActionButton && !actionIsSelected) return

        switch (index) {
            case 0:
                break
            case actionButtons.length - 1:
                RectAreaService.setRight(
                    actionButton.uiObjects.buttonIcon.drawArea,
                    ScreenDimensions.SCREEN_WIDTH -
                        RectAreaService.width(
                            ActionButtonService.getExpectedDrawBoundingBox(
                                actionButton,
                                graphicsBuffer
                            )
                        ) -
                        WINDOW_SPACING.SPACING4
                )
                break
            default:
                actionButton.uiObjects.buttonIcon.drawArea.left =
                    RectAreaService.right(
                        ActionButtonService.getExpectedDrawBoundingBox(
                            actionButtons[index - 1],
                            graphicsBuffer
                        )
                    ) + WINDOW_SPACING.SPACING2
                break
        }

        const actionIsEnabled: boolean = actionButton.actionTemplate
            ? actionValidity[actionButton.actionTemplate.id]?.isValid
            : true

        const actionIsConsidered: boolean = actionButton.actionTemplate
            ? consideredActionTemplateId === actionButton.actionTemplate.id
            : actionButton.actionTemplateOverride.name ===
              consideredActionTemplateId

        const actionHasAWarning: boolean = actionButton.actionTemplate
            ? actionValidity[actionButton.actionTemplate.id]?.warning
            : false

        ActionButtonService.draw({
            actionButton,
            graphicsBuffer,
            resourceHandler,
            disabled: !actionIsEnabled,
            selected: actionIsConsidered || actionIsSelected,
            warning: actionHasAWarning,
        })
    })
}
