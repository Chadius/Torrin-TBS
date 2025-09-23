import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageService,
} from "../../message/messageBoardMessage"
import { LoadSaveStateService } from "./loadState"

export class PlayerDataMessageListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(id: string) {
        this.messageBoardListenerId = id
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadUserRequest(
                message
            )
        ) {
            LoadSaveStateService.userRequestsLoad(message.loadState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadBegin(
                message
            )
        ) {
            LoadSaveStateService.applicationStartsLoad(message.loadState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadComplete(
                message
            )
        ) {
            LoadSaveStateService.applicationCompletesLoad(
                message.loadState,
                message.saveState
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadErrorDuring(
                message
            )
        ) {
            LoadSaveStateService.applicationErrorsWhileLoading(
                message.loadState
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadUserCancel(
                message
            )
        ) {
            LoadSaveStateService.userCancelsLoad(message.loadState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadFinishRequest(
                message
            )
        ) {
            LoadSaveStateService.userFinishesRequestingLoad(message.loadState)
            LoadSaveStateService.reset(message.loadState)
            return
        }
    }
}
