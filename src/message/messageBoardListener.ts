import { MessageBoardMessage } from "./messageBoardMessage"

export interface MessageBoardListener {
    messageBoardListenerId: string
    receiveMessage: (message: MessageBoardMessage) => void
}
