import { MessageBoardListener } from "./messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "./messageBoardMessage"
import { MessageBoard } from "./messageBoard"

class TestMessageListener implements MessageBoardListener {
    messageBoardListenerId: string
    message: string

    constructor(listenerId: string) {
        this.messageBoardListenerId = listenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (message.type !== MessageBoardMessageType.BASE) {
            return
        }
        this.message = message.message
    }
}

describe("MessageBoard", () => {
    it("can register listeners and retrieve them", () => {
        const messageBoard = new MessageBoard()
        const messageBoardListener = new TestMessageListener(
            "testMessageListener"
        )
        messageBoard.addListener(
            messageBoardListener,
            MessageBoardMessageType.BASE
        )
        expect(
            messageBoard.getListenerById(
                messageBoardListener.messageBoardListenerId
            )
        ).toBe(messageBoardListener)
        expect(
            messageBoard.getListenersByMessageType(MessageBoardMessageType.BASE)
        ).toEqual([messageBoardListener])
    })

    it("returns nothing if there are no messages with the message id or type", () => {
        const messageBoard = new MessageBoard()

        expect(
            messageBoard.getListenersByMessageType(MessageBoardMessageType.BASE)
        ).toHaveLength(0)

        const messageBoardListener = new TestMessageListener(
            "testMessageListener"
        )
        messageBoard.addListener(
            messageBoardListener,
            MessageBoardMessageType.BASE
        )
        expect(messageBoard.getListenerById("does not exist")).toBeUndefined()
    })

    it("calls listener function if the id is used", () => {
        const messageBoard = new MessageBoard()
        const messageBoardLoggerSpy = jest.spyOn(messageBoard, "logMessage")
        const messageBoardListener = new TestMessageListener(
            "testMessageListener"
        )
        messageBoard.addListener(
            messageBoardListener,
            MessageBoardMessageType.BASE
        )

        const messageReceivedSpy = jest.spyOn(
            messageBoardListener,
            "receiveMessage"
        )
        const message = "sending this message"
        messageBoard.sendMessage({
            type: MessageBoardMessageType.BASE,
            message: message,
        })

        expect(messageReceivedSpy).toBeCalled()
        expect(messageBoardListener.message).toEqual(message)

        expect(messageBoardLoggerSpy).toBeCalledWith(
            expect.objectContaining({
                message: "sendMessage: BASE to testMessageListener",
            })
        )
    })

    describe("logMessages flag will control printing messages", () => {
        let messageBoard: MessageBoard
        let messageBoardListener: MessageBoardListener
        let consoleSpy: jest.SpyInstance

        afterEach(() => {
            consoleSpy.mockRestore()
        })

        const setupMessageBoardAndListener = (logMessages: boolean) => {
            messageBoard = new MessageBoard({ logMessages })
            consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {})
            messageBoardListener = new TestMessageListener(
                "testMessageListener"
            )
            messageBoard.addListener(
                messageBoardListener,
                MessageBoardMessageType.BASE
            )
        }

        it("will send messages when the flag is on", () => {
            setupMessageBoardAndListener(true)
            messageBoard.sendMessage({
                type: MessageBoardMessageType.BASE,
                message: "sending a message",
            })
            expect(consoleSpy).toBeCalledWith(
                "sendMessage: BASE to testMessageListener"
            )
        })

        it("will not send messages when the flag is on", () => {
            setupMessageBoardAndListener(false)
            messageBoard.sendMessage({
                type: MessageBoardMessageType.BASE,
                message: "sending a message",
            })
            expect(consoleSpy).not.toBeCalled()
        })
    })

    it("removes listeners by id", () => {
        const messageBoard = new MessageBoard()
        const messageBoardListener = new TestMessageListener(
            "testMessageListener"
        )
        messageBoard.addListener(
            messageBoardListener,
            MessageBoardMessageType.BASE
        )

        messageBoard.removeListenerById(
            messageBoardListener.messageBoardListenerId
        )

        expect(
            messageBoard.getListenerById(
                messageBoardListener.messageBoardListenerId
            )
        ).toBeUndefined()
    })
})
