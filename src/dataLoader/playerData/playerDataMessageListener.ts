import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageService,
} from "../../message/messageBoardMessage"
import { LoadSaveStateService } from "./loadSaveState"

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
            LoadSaveStateService.userRequestsLoad(message.loadSaveState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadBegin(
                message
            )
        ) {
            LoadSaveStateService.applicationStartsLoad(message.loadSaveState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadComplete(
                message
            )
        ) {
            LoadSaveStateService.applicationCompletesLoad(
                message.loadSaveState,
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
                message.loadSaveState
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadUserCancel(
                message
            )
        ) {
            LoadSaveStateService.userCancelsLoad(message.loadSaveState)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerDataLoadFinishRequest(
                message
            )
        ) {
            LoadSaveStateService.userFinishesRequestingLoad(
                message.loadSaveState
            )
            LoadSaveStateService.reset(message.loadSaveState)
            return
        }
    }
}
