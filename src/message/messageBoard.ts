import {MessageBoardListener} from "./messageBoardListener";
import {MessageBoardMessage, MessageBoardMessageType} from "./messageBoardMessage";

export class MessageBoard {
    listeners: {
        id: string,
        messageBoardMessageType: MessageBoardMessageType,
        listener: MessageBoardListener,
    }[];

    constructor() {
        this.listeners = [];
    }

    addListener = (messageBoardListener: MessageBoardListener, messageBoardMessageType: MessageBoardMessageType) => {
        this.listeners.push({
            id: messageBoardListener.messageBoardListenerId,
            listener: messageBoardListener,
            messageBoardMessageType,
        })
    }
    getListenerById = (messageBoardListenerId: string): MessageBoardListener => {
        const listenerInfo = this.listeners.find(listener => listener.id === messageBoardListenerId)

        return listenerInfo === undefined
            ? undefined
            : listenerInfo.listener;
    }
    getListenersByMessageType = (messageBoardMessageType: MessageBoardMessageType): MessageBoardListener[] => {
        return this.listeners
            .filter(
                listener => listener.messageBoardMessageType === messageBoardMessageType
            ).map(
                listenerInfo => listenerInfo.listener
            );
    }
    sendMessage = (message: MessageBoardMessage) => {
        this.getListenersByMessageType(message.type).forEach(listener => listener.receiveMessage(message));
    }

    removeListenerById = (messageBoardListenerId: string) => {
        const indexToDelete = this.listeners.findIndex(listener => listener.id === messageBoardListenerId)

        if (indexToDelete === -1) {
            return;
        }

        this.listeners.splice(indexToDelete, 1);
    }
}
