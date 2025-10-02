import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SummaryHUDState } from "../summary/summaryHUD"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import {
    MouseButton,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { ActionTemplate } from "../../../action/template/actionTemplate"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { WINDOW_SPACING } from "../../../ui/constants"
import { LabelService } from "../../../ui/label"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ActionValidityStatus } from "../../actionValidity/validityChecker"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { TextGraphicalHandlingService } from "../../../utils/graphics/textGraphicalHandlingService"
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
import { CampaignResources } from "../../../campaign/campaignResources"
import {
    PlayerInputStateService,
    TPlayerInputAction,
} from "../../../ui/playerInput/playerInputState"
import {
    ActionValidityByIdCache,
    ActionValidityByIdCacheService,
} from "../../actionValidity/cache/actionValidityByIdCache"
import { EnumLike } from "../../../utils/enum"
import { GameEngineState } from "../../../gameEngine/gameEngineState/gameEngineState"

export const END_TURN_NAME = "END TURN"

export const PlayerCommandSelection = {
    PLAYER_COMMAND_SELECTION_NONE: "PLAYER_COMMAND_SELECTION_NONE",
    PLAYER_COMMAND_SELECTION_ACTION: "PLAYER_COMMAND_SELECTION_ACTION",
    PLAYER_COMMAND_SELECTION_MOVE: "PLAYER_COMMAND_SELECTION_MOVE",
    PLAYER_COMMAND_SELECTION_END_TURN: "PLAYER_COMMAND_SELECTION_END_TURN",
} as const satisfies Record<string, string>

export type TPlayerCommandSelection = EnumLike<typeof PlayerCommandSelection>

export interface PlayerCommandState {
    consideredActionTemplateId: string | undefined
    playerSelectedSquaddieAction: boolean | undefined
    selectedActionTemplateId: string | undefined
    playerSelectedEndTurn: boolean
    battleSquaddieId: string | undefined
    newInvalidPopup?: {
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
    removeSelection: (playerCommandState: PlayerCommandState) => {
        playerCommandState.consideredActionTemplateId = undefined
        playerCommandState.playerSelectedSquaddieAction = false
        playerCommandState.selectedActionTemplateId = undefined
        playerCommandState.playerSelectedEndTurn = false
    },
    createCommandWindow: ({
        summaryHUDState,
        objectRepository,
        battleSquaddieId,
        campaignResources,
    }: {
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
    }) => {
        summaryHUDState.playerCommandState.battleSquaddieId = battleSquaddieId
        createActionButtons({
            playerCommandState: summaryHUDState.playerCommandState,
            campaignResources,
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
    }): TPlayerCommandSelection => {
        if (
            !isValidValue(playerCommandState) ||
            playerCommandState.battleSquaddieId == undefined
        ) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        let actionButtonClicked = getSelectedActionButton({
            playerCommandState,
            mouseRelease,
        })

        if (isActionButtonEndTurn(actionButtonClicked)) {
            return playerSelectedEndTurnButton({
                playerCommandState,
            })
        }
        const repository = gameEngineState.repository
        if (repository == undefined)
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE

        gameEngineState.battleOrchestratorState.cache.actionValidity =
            ActionValidityByIdCacheService.calculateActionValidity({
                objectRepository: repository,
                battleSquaddieId: playerCommandState.battleSquaddieId,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                actionValidityByIdCache:
                    gameEngineState.battleOrchestratorState.cache
                        .actionValidity,
            })

        if (
            actionButtonClicked?.actionTemplate != undefined &&
            gameEngineState.battleOrchestratorState.cache.actionValidity
                .byActionTemplateId[actionButtonClicked.actionTemplate.id]
                ?.isValid
        ) {
            return playerSelectedActionButton({
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

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.battleSquaddieId
        if (battleSquaddieId == undefined) return
        if (gameEngineState.repository == undefined) return

        gameEngineState.battleOrchestratorState.cache.actionValidity =
            ActionValidityByIdCacheService.calculateActionValidity({
                objectRepository: gameEngineState.repository,
                battleSquaddieId: battleSquaddieId,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                actionValidityByIdCache:
                    gameEngineState.battleOrchestratorState.cache
                        .actionValidity,
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
                type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                playerCommandState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState?.playerCommandState,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                playerDecisionHUD:
                    gameEngineState.battleOrchestratorState.playerDecisionHUD,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })
            return
        }

        if (!consideredActionButton) return

        playerCommandState.consideredActionTemplateId =
            ActionButtonService.getActionTemplateId(consideredActionButton)

        createNewInvalidPopupMessageIfNeeded({
            playerCommandState,
            actionButton: consideredActionButton,
            actionValidityByIdCache:
                gameEngineState.battleOrchestratorState.cache.actionValidity,
        })

        if (
            !gameEngineState.battleOrchestratorState.cache.actionValidity
                .byActionTemplateId[
                playerCommandState.consideredActionTemplateId
            ]?.isValid ||
            gameEngineState.battleOrchestratorState.battleState
                .playerConsideredActions == undefined
        ) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
            playerConsideredActions:
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions,
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            playerDecisionHUD:
                gameEngineState.battleOrchestratorState.playerDecisionHUD,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            objectRepository: gameEngineState.repository,
            glossary: gameEngineState.battleOrchestratorState.glossary,
            useAction: {
                actionTemplateId: isActionButtonEndTurn(consideredActionButton)
                    ? undefined
                    : consideredActionButton.actionTemplate?.id,
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

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.battleSquaddieId
        if (battleSquaddieId && gameEngineState.repository) {
            gameEngineState.battleOrchestratorState.cache.actionValidity =
                ActionValidityByIdCacheService.calculateActionValidity({
                    objectRepository: gameEngineState.repository,
                    battleSquaddieId: battleSquaddieId,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actionValidityByIdCache:
                        gameEngineState.battleOrchestratorState.cache
                            .actionValidity,
                })
        }

        drawActionButtons({
            actionButtons: playerCommandState.actionButtons,
            graphicsBuffer: graphicsBuffer,
            resourceHandler: resourceHandler,
            actionValidity:
                gameEngineState.battleOrchestratorState.cache.actionValidity
                    .byActionTemplateId,
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
    keyPressed: ({
        gameEngineState,
        playerCommandState,
        playerInputAction,
    }: {
        playerInputAction: TPlayerInputAction
        gameEngineState: GameEngineState
        playerCommandState: PlayerCommandState
    }): TPlayerCommandSelection => {
        if (!isValidValue(playerCommandState)) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        let actionButtonClicked = getSelectedActionButton({
            playerCommandState,
            playerInputAction,
        })

        if (isActionButtonEndTurn(actionButtonClicked)) {
            return playerSelectedEndTurnButton({
                playerCommandState,
            })
        }

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.battleSquaddieId
        if (battleSquaddieId && gameEngineState.repository) {
            gameEngineState.battleOrchestratorState.cache.actionValidity =
                ActionValidityByIdCacheService.calculateActionValidity({
                    objectRepository: gameEngineState.repository,
                    battleSquaddieId: battleSquaddieId,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actionValidityByIdCache:
                        gameEngineState.battleOrchestratorState.cache
                            .actionValidity,
                })
        }

        if (
            actionButtonClicked?.actionTemplate != undefined &&
            gameEngineState.battleOrchestratorState.cache.actionValidity
                .byActionTemplateId[actionButtonClicked.actionTemplate.id]
                ?.isValid
        ) {
            return playerSelectedActionButton({
                playerCommandState,
                actionTemplateId: actionButtonClicked.actionTemplate.id,
            })
        }

        createNewInvalidPopupMessageIfNeeded({
            playerCommandState,
            actionButton: actionButtonClicked,
            actionValidityByIdCache:
                gameEngineState.battleOrchestratorState.cache.actionValidity,
        })
        return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
    },
}

const createNewInvalidPopupMessageIfNeeded = ({
    playerCommandState,
    actionButton,
    actionValidityByIdCache,
}: {
    playerCommandState: PlayerCommandState
    actionButton: ActionButton | undefined
    actionValidityByIdCache: ActionValidityByIdCache
}) => {
    if (actionButton == undefined) return
    const actionTemplateId = actionButton.actionTemplate?.id
    if (
        actionTemplateId == undefined ||
        actionValidityByIdCache.byActionTemplateId[actionTemplateId]?.messages
            .length == 0
    )
        return

    playerCommandState.newInvalidPopup = {
        buttonArea: actionButton.uiObjects.buttonIcon.drawArea,
        message:
            actionValidityByIdCache.byActionTemplateId[
                actionTemplateId
            ].messages.join("\n"),
    }
}

const isActionButtonEndTurn = (actionButtonClicked: ActionButton | undefined) =>
    actionButtonClicked?.actionTemplateOverride?.name === END_TURN_NAME

const playerSelectedEndTurnButton = ({
    playerCommandState,
}: {
    playerCommandState: PlayerCommandState
}) => {
    playerCommandState.playerSelectedEndTurn = true
    playerCommandState.playerSelectedSquaddieAction = false
    playerCommandState.selectedActionTemplateId = undefined
    return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN
}

const playerSelectedActionButton = ({
    playerCommandState,
    actionTemplateId,
}: {
    playerCommandState: PlayerCommandState
    actionTemplateId: string
}): TPlayerCommandSelection => {
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
    const windowWidth: number =
        TextGraphicalHandlingService.calculateLengthOfLineOfText({
            text: playerCommandState.newInvalidPopup.message,
            fontSize:
                DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSizeRange
                    .preferred,
            strokeWeight:
                DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.strokeWeight,
            graphicsContext: graphicsBuffer,
        })
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
        gameEngineState,
        popupWindow: PopupWindowService.new({
            coordinateSystem: CoordinateSystem.SCREEN,
            label: LabelService.new({
                fontSize:
                    DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSizeRange
                        .preferred,
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
    battleSquaddieId,
    campaignResources,
}: {
    playerCommandState: PlayerCommandState
    objectRepository: ObjectRepository
    battleSquaddieId: string
    campaignResources: CampaignResources
}) => {
    const { squaddieTemplate } = ObjectRepositoryService.getSquaddieByBattleId(
        objectRepository,
        battleSquaddieId
    )

    playerCommandState.squaddieAffiliationHue =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    const defaultButtonIconResourceKey =
        campaignResources.actionEffectSquaddieTemplateButtonIcons.UNKNOWN

    const actionTileBoundingBox =
        SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
            ActionTilePosition.ACTION_PREVIEW
        )

    playerCommandState.actionButtons = squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(objectRepository, id)
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
                buttonIconResourceKey: campaignResources.endTurnIconResourceKey,
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
            : actionButton.actionTemplateOverride?.name ===
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
        if (actionButton.uiObjects.actionResourceCostDisplay) {
            actionButton.uiObjects.actionResourceCostDisplay.drawingArea =
                RectAreaService.withLeft(
                    actionButton.uiObjects.actionResourceCostDisplay
                        .drawingArea,
                    RectAreaService.left(
                        actionButton.uiObjects.buttonIcon.drawArea
                    )
                )
        }

        const actionIsEnabled: boolean = actionButton.actionTemplate
            ? actionValidity[actionButton.actionTemplate.id]?.isValid
            : true

        const actionIsConsidered: boolean = actionButton.actionTemplate
            ? consideredActionTemplateId === actionButton.actionTemplate.id
            : actionButton.actionTemplateOverride?.name ===
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

const getSelectedActionButton = ({
    playerCommandState,
    playerInputAction,
    mouseRelease,
}: {
    playerCommandState: PlayerCommandState
    playerInputAction?: TPlayerInputAction
    mouseRelease?: MouseRelease
}) => {
    if (!isValidValue(playerCommandState)) {
        return undefined
    }

    switch (true) {
        case playerInputAction != undefined:
            let actionButtonIndexSelected =
                PlayerInputStateService.listIndexToNumber(playerInputAction)
            if (
                actionButtonIndexSelected == undefined ||
                actionButtonIndexSelected >=
                    playerCommandState.actionButtons.length
            ) {
                return undefined
            }
            return playerCommandState.actionButtons[actionButtonIndexSelected]
        case mouseRelease != undefined:
            if (mouseRelease.button !== MouseButton.ACCEPT) {
                return undefined
            }

            return playerCommandState.actionButtons.find((actionButton) =>
                ActionButtonService.shouldSelectActionBecauseOfMouseButton(
                    actionButton,
                    mouseRelease
                )
            )
        default:
            return undefined
    }
}
