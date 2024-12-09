import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { FILE_MESSAGE_DISPLAY_DURATION, TitleScreen } from "./titleScreen"
import { TitleScreenState } from "./titleScreenState"
import { GameModeEnum } from "../utils/startupConfig"
import { MouseButton } from "../utils/mouseConfig"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { ResourceHandler } from "../resource/resourceHandler"
import { RectAreaService } from "../ui/rectArea"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import { LoadSaveState } from "../dataLoader/loadSaveState"

describe("Title Screen", () => {
    let gameEngineState: GameEngineState
    let titleScreen: TitleScreen
    let titleScreenState: TitleScreenState
    let mockResourceHandler: ResourceHandler
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            ScreenDimensions.SCREEN_WIDTH
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            ScreenDimensions.SCREEN_HEIGHT
        )
        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true)
        mockResourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValue(true)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue({ width: 32, height: 32 })
        titleScreen = new TitleScreen({
            resourceHandler: mockResourceHandler,
            version: "TEST",
        })
        titleScreenState = titleScreen.setup()
        gameEngineState = GameEngineStateService.new({
            titleScreenState,
            resourceHandler: mockResourceHandler,
        })
    })

    it("will setup when called and generate a state", () => {
        expect(titleScreenState).not.toBeUndefined()
    })

    it("will declare itself complete when the user clicks on the start button and the button is drawn active", () => {
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.mouseClicked(
            gameEngineState,
            MouseButton.ACCEPT,
            RectAreaService.centerX(
                titleScreen.startNewGameButton.readyLabel.textBox.area
            ),
            RectAreaService.centerY(
                titleScreen.startNewGameButton.readyLabel.textBox.area
            )
        )
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        expect(textSpy).toBeCalled()
        expect(textSpy).toBeCalledWith(
            "Now loading...",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will declare itself complete when the user presses the enter key", () => {
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            ScreenDimensions.SCREEN_WIDTH
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            ScreenDimensions.SCREEN_HEIGHT
        )
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.keyPressed(
            gameEngineState,
            JSON.parse(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT)[0]
        )
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        expect(textSpy).toBeCalled()
        expect(textSpy).toBeCalledWith(
            "Now loading...",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will upon completion recommend the loading battle state", () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const recommendation =
            titleScreen.recommendStateChanges(gameEngineState)
        expect(recommendation.nextMode).toBe(GameModeEnum.LOADING_BATTLE)
    })

    it("after resetting it will not immediately complete", () => {
        const spy = jest
            .spyOn(titleScreen, "hasCompleted")
            .mockReturnValueOnce(true)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        spy.mockClear()
        titleScreen.reset(gameEngineState)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
    })

    it("will update the start game button if the window is too small", () => {
        const [mockedWidth, mockedHeight] = [
            ScreenDimensions.SCREEN_WIDTH / 2,
            ScreenDimensions.SCREEN_HEIGHT / 2,
        ]
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            mockedWidth
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            mockedHeight
        )
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        const expectedButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${mockedWidth}x${mockedHeight}`
        expect(textSpy).toBeCalledWith(
            expectedButtonLabel,
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will say the window is too small if the window is too small", () => {
        const [mockedWidth, mockedHeight] = [1, 1]
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            mockedWidth
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            mockedHeight
        )
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        const expectedButtonLabel = `Window is too small`
        expect(textSpy).toBeCalledWith(
            expectedButtonLabel,
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will reset the screen size warning if the window is restored", () => {
        const [mockedWidth, mockedHeight] = [1, 1]
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            mockedWidth
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            mockedHeight
        )
        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            ScreenDimensions.SCREEN_WIDTH
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            ScreenDimensions.SCREEN_HEIGHT
        )

        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(textSpy).toBeCalledWith(
            "START: click here / press enter",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will gather resources once upon startup", () => {
        const [mockedWidth, mockedHeight] = [1, 1]
        jest.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            mockedWidth
        )
        jest.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            mockedHeight
        )

        mockResourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true)
        const isResourceLoadedMock = jest.spyOn(
            mockResourceHandler,
            "isResourceLoaded"
        )

        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const resourceCallCount = isResourceLoadedMock.mock.calls.length
        expect(mockResourceHandler.isResourceLoaded).toBeCalledTimes(
            resourceCallCount
        )

        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(mockResourceHandler.isResourceLoaded).toBeCalledTimes(
            resourceCallCount
        )
    })

    describe("user clicks the load button", () => {
        it("will begin the loading process when the user clicks the button", () => {
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            const loadGame = jest.spyOn(titleScreen, "markGameToBeLoaded")
            titleScreen.mouseClicked(
                gameEngineState,
                MouseButton.ACCEPT,
                RectAreaService.centerX(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                ),
                RectAreaService.centerY(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                )
            )
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
            expect(loadGame).toBeCalled()

            expect(
                gameEngineState.fileState.loadSaveState.userRequestedLoad
            ).toBeTruthy()

            let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            expect(textSpy).toBeCalled()
            expect(textSpy).toBeCalledWith(
                "Now loading...",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
        it("should ignore other inputs while loading", () => {
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            titleScreen.mouseClicked(
                gameEngineState,
                MouseButton.ACCEPT,
                RectAreaService.centerX(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                ),
                RectAreaService.centerY(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                )
            )
            expect(titleScreen.newGameSelected).toBeFalsy()

            titleScreen.mouseClicked(
                gameEngineState,
                MouseButton.ACCEPT,
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT - 1
            )
            expect(titleScreen.newGameSelected).toBeFalsy()
        })
        describe("should show an error message when nothing is loaded", () => {
            const tests = [
                {
                    name: "application errors",
                    loadSaveStateChange: (
                        loadSaveState: LoadSaveState
                    ): void => {
                        loadSaveState.applicationErroredWhileLoading = true
                    },
                    expectedSaveStateField: (
                        loadSaveState: LoadSaveState
                    ): boolean => {
                        return loadSaveState.applicationErroredWhileLoading
                    },
                    expectedErrorMessage: `Loading failed. Check logs.`,
                },
                {
                    name: "user cancels",
                    loadSaveStateChange: (
                        loadSaveState: LoadSaveState
                    ): void => {
                        loadSaveState.userCanceledLoad = true
                    },
                    expectedSaveStateField: (
                        loadSaveState: LoadSaveState
                    ): boolean => {
                        return loadSaveState.userCanceledLoad
                    },
                    expectedErrorMessage: `Canceled loading.`,
                },
            ]
            it.each(tests)(
                `$name`,
                ({
                    name,
                    loadSaveStateChange,
                    expectedSaveStateField,
                    expectedErrorMessage,
                }) => {
                    jest.spyOn(Date, "now").mockReturnValue(0)
                    const loadGame = jest.spyOn(
                        titleScreen,
                        "markGameToBeLoaded"
                    )
                    titleScreen.update(gameEngineState, mockedP5GraphicsContext)
                    titleScreen.mouseClicked(
                        gameEngineState,
                        MouseButton.ACCEPT,
                        RectAreaService.centerX(
                            titleScreen.continueGameButton.readyLabel.textBox
                                .area
                        ),
                        RectAreaService.centerY(
                            titleScreen.continueGameButton.readyLabel.textBox
                                .area
                        )
                    )
                    loadSaveStateChange(gameEngineState.fileState.loadSaveState)

                    const textSpy = jest.spyOn(
                        mockedP5GraphicsContext.mockedP5,
                        "text"
                    )
                    titleScreen.update(gameEngineState, mockedP5GraphicsContext)

                    expect(loadGame).toBeCalled()
                    expect(textSpy).toBeCalled()
                    expect(textSpy).toBeCalledWith(
                        expect.stringMatching(expectedErrorMessage),
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )
                    expect(
                        expectedSaveStateField(
                            gameEngineState.fileState.loadSaveState
                        )
                    ).toBeTruthy()

                    jest.spyOn(Date, "now").mockReturnValue(
                        FILE_MESSAGE_DISPLAY_DURATION
                    )
                    textSpy.mockClear()
                    titleScreen.update(gameEngineState, mockedP5GraphicsContext)
                    expect(textSpy).not.toBeCalledWith(
                        expect.stringMatching(expectedErrorMessage),
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )

                    expect(
                        expectedSaveStateField(
                            gameEngineState.fileState.loadSaveState
                        )
                    ).toBeFalsy()
                }
            )
        })

        it("should show a failure message if the load failed", () => {
            jest.spyOn(Date, "now").mockReturnValue(0)
            const loadGame = jest.spyOn(titleScreen, "markGameToBeLoaded")
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            titleScreen.mouseClicked(
                gameEngineState,
                MouseButton.ACCEPT,
                RectAreaService.centerX(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                ),
                RectAreaService.centerY(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                )
            )
            gameEngineState.fileState.loadSaveState.applicationErroredWhileLoading =
                true

            const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)

            expect(loadGame).toBeCalled()
            expect(textSpy).toBeCalled()
            expect(textSpy).toBeCalledWith(
                expect.stringMatching(`Loading failed. Check logs.`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
            expect(
                gameEngineState.fileState.loadSaveState
                    .applicationErroredWhileLoading
            ).toBeTruthy()

            jest.spyOn(Date, "now").mockReturnValue(
                FILE_MESSAGE_DISPLAY_DURATION
            )
            textSpy.mockClear()
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            expect(textSpy).not.toBeCalledWith(
                expect.stringMatching(`Loading failed. Check logs.`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )

            expect(
                gameEngineState.fileState.loadSaveState
                    .applicationErroredWhileLoading
            ).toBeFalsy()
        })
        it("should mark as completed and recommend the battle loader", () => {
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            titleScreen.mouseClicked(
                gameEngineState,
                MouseButton.ACCEPT,
                RectAreaService.centerX(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                ),
                RectAreaService.centerY(
                    titleScreen.continueGameButton.readyLabel.textBox.area
                )
            )
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
            expect(
                titleScreen.recommendStateChanges(gameEngineState).nextMode
            ).toBe(GameModeEnum.LOADING_BATTLE)
        })
    })

    it("will show the version", () => {
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(textSpy).toBeCalled()
        expect(textSpy).toBeCalledWith(
            "Version TEST",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })
})
