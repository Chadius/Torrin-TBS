import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { LoadSaveStateService } from "./loadSaveState"

export class PlayerDataMessageListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(id: string) {
        this.messageBoardListenerId = id
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST:
                LoadSaveStateService.userRequestsLoad(message.loadSaveState)
                break
            case MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN:
                LoadSaveStateService.applicationStartsLoad(
                    message.loadSaveState
                )
                break
            case MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE:
                LoadSaveStateService.applicationCompletesLoad(
                    message.loadSaveState,
                    message.saveState
                )
                break
            case MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING:
                LoadSaveStateService.applicationErrorsWhileLoading(
                    message.loadSaveState
                )
                break
            case MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL:
                LoadSaveStateService.userCancelsLoad(message.loadSaveState)
                break
            case MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD:
                LoadSaveStateService.userFinishesRequestingLoad(
                    message.loadSaveState
                )
                break
        }
    }
}
