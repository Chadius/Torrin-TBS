import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ResourceHandler } from "../../resource/resourceHandler"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { MessageBoard } from "../../message/messageBoard"
import { ResourceHandlerBlocker } from "./resourceHandlerBlocker"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"

describe("Load Blocker", () => {
    let loadBlocker: ResourceHandlerBlocker
    let resourceHandler: ResourceHandler
    let messageBoard: MessageBoard
    let messageSpy: MockInstance

    beforeEach(() => {
        messageBoard = new MessageBoard()
        messageSpy = vi.spyOn(messageBoard, "sendMessage")
        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
    })

    afterEach(() => {
        messageSpy.mockRestore()
    })

    describe("begin loading after getting a resource key", () => {
        beforeEach(() => {
            loadBlocker = new ResourceHandlerBlocker(
                resourceHandler,
                messageBoard
            )
            loadBlocker.queueResourceToLoad("resourceKey")
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        })

        it("sets its starting loading flag to true", () => {
            loadBlocker.beginLoading()
            expect(loadBlocker.startsLoading).toBeTruthy()
            expect(loadBlocker.finishesLoading).toBeFalsy()
        })

        it("sends a signal that it began loading and will not send it again until it finishes loading", () => {
            loadBlocker.beginLoading()
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES,
            })
            messageSpy.mockClear()
            loadBlocker.beginLoading()
            expect(messageSpy).not.toBeCalledWith({
                type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES,
            })
        })

        it("tells the resource handler to begin loading resources", () => {
            loadBlocker.queueResourceToLoad("resourceKey2")
            loadBlocker.queueResourceToLoad([
                "resourceKey2",
                "resourceKey2",
                "resourceKey3",
                "resourceKey4",
            ])
            loadBlocker.beginLoading()
            expect(resourceHandler.loadResource).toBeCalledTimes(4)
            expect(resourceHandler.loadResource).toBeCalledWith("resourceKey2")
        })
    })

    describe("no resources are queued", () => {
        beforeEach(() => {
            loadBlocker = new ResourceHandlerBlocker(
                resourceHandler,
                messageBoard
            )
            loadBlocker.beginLoading()
        })
        it("sets its loading flag to false", () => {
            expect(loadBlocker.startsLoading).toBeFalsy()
            expect(loadBlocker.finishesLoading).toBeFalsy()
        })
        it("does not send any messages", () => {
            expect(messageSpy).not.toBeCalledWith({
                type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES,
            })
            expect(messageSpy).not.toBeCalledWith({
                type: MessageBoardMessageType.LOAD_BLOCKER_FINISHES_LOADING_RESOURCES,
            })
        })
    })

    it("will reject adding more resource keys if it has begun loading", () => {
        loadBlocker = new ResourceHandlerBlocker(resourceHandler, messageBoard)
        resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        loadBlocker.queueResourceToLoad("resourceKey")
        const addResource = (resourceKey: string) => {
            loadBlocker.queueResourceToLoad(resourceKey)
        }
        expect(() => {
            addResource("resourceKey2")
        }).not.toThrow()
        loadBlocker.beginLoading()
        expect(() => {
            addResource("resourceKey3")
        }).toThrowError("already started loading")
    })

    describe("will unblock when polled after resources are loaded", () => {
        beforeEach(() => {
            loadBlocker = new ResourceHandlerBlocker(
                resourceHandler,
                messageBoard
            )
            loadBlocker.queueResourceToLoad("1")
            loadBlocker.queueResourceToLoad("2")
            loadBlocker.queueResourceToLoad("3")
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        })

        it("will remain blocked if some of the resources have not loaded", () => {
            resourceHandler.isResourceLoaded = vi
                .fn()
                .mockImplementation((key: string) => {
                    return key === "1"
                })
            loadBlocker.beginLoading()
            messageSpy.mockClear()
            loadBlocker.updateLoadingStatus()
            expect(messageSpy).not.toBeCalled()
        })

        it("will send a message if all resources are loaded", () => {
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
            loadBlocker.beginLoading()
            messageSpy.mockClear()
            loadBlocker.updateLoadingStatus()
            expect(messageSpy).not.toBeCalledWith({
                type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES,
            })
        })

        it("will not be loading if all resources are loaded", () => {
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
            loadBlocker.beginLoading()
            loadBlocker.updateLoadingStatus()
            expect(loadBlocker.startsLoading).toBeTruthy()
            expect(loadBlocker.finishesLoading).toBeTruthy()
        })
    })
})
