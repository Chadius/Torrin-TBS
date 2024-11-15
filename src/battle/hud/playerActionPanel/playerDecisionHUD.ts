import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { isValidValue } from "../../../utils/validityCheck"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "../popupWindow"

export const WARNING_POPUP_TEXT_SIZE = 16
export const WARNING_POPUP_TEXT_WIDTH_MULTIPLIER = 0.5
const INVALID_SELECTION_POP_UP_DURATION_MS = 2000

export class PlayerDecisionHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            message.type === MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
        ) {
            PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
                message,
                popupWindow: message.popupWindow,
                playerDecisionHUD:
                    message.gameEngineState.battleOrchestratorState
                        .playerDecisionHUD,
            })
        }
    }
}

export enum PopupWindowType {
    PLAYER_INVALID_SELECTION = "PLAYER_INVALID_SELECTION",
}

export interface PlayerDecisionHUD {
    popupWindows: {
        [key in PopupWindowType]: PopupWindow
    }
}

export const PlayerDecisionHUDService = {
    new: (): PlayerDecisionHUD => {
        return {
            popupWindows: {
                [PopupWindowType.PLAYER_INVALID_SELECTION]: undefined,
            },
        }
    },
    draw: (
        playerDecisionHUD: PlayerDecisionHUD,
        graphicsContext: GraphicsBuffer
    ) => {
        Object.values(playerDecisionHUD.popupWindows)
            .filter(isValidValue)
            .forEach((popupWindow) => {
                PopupWindowService.draw(popupWindow, graphicsContext)
            })
    },
    setPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindow: PopupWindow,
        popupWindowType: PopupWindowType
    ) => setPopupWindow(playerDecisionHUD, popupWindow, popupWindowType),
    clearPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindowType: PopupWindowType
    ) => {
        playerDecisionHUD.popupWindows[popupWindowType] = undefined
    },
    createPlayerInvalidSelectionPopup: ({
        playerDecisionHUD,
        message,
        popupWindow,
    }: {
        playerDecisionHUD: PlayerDecisionHUD
        message: MessageBoardMessagePlayerSelectionIsInvalid
        popupWindow: PopupWindow
    }) => {
        PopupWindowService.changeStatus(popupWindow, PopupWindowStatus.ACTIVE)

        PopupWindowService.setInactiveAfterTimeElapsed(
            popupWindow,
            INVALID_SELECTION_POP_UP_DURATION_MS
        )

        setPopupWindow(
            playerDecisionHUD,
            popupWindow,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )
    },
}

const setPopupWindow = (
    playerDecisionHUD: PlayerDecisionHUD,
    popupWindow: PopupWindow,
    popupWindowType: PopupWindowType
) => {
    playerDecisionHUD.popupWindows[popupWindowType] = popupWindow
}
