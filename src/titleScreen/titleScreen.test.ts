import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import {
    TitleScreen,
    TitleScreenContext,
    TitleScreenUIObjects,
} from "./titleScreen"
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
import {
    LoadSaveState,
    LoadSaveStateService,
} from "../dataLoader/playerData/loadSaveState"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerInputTestService } from "../utils/test/playerInput"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { PlayerDataMessageListener } from "../dataLoader/playerData/playerDataMessageListener"
import { DataBlobService } from "../utils/dataBlob/dataBlob"
import { WindowService } from "../utils/graphics/window"
import { Button } from "../ui/button/button"
import { TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION } from "./components/continueGameButton"

describe("Title Screen", () => {
    let gameEngineState: GameEngineState
    let titleScreen: TitleScreen
    let titleScreenState: TitleScreenState
    let mockResourceHandler: ResourceHandler
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        vi.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            ScreenDimensions.SCREEN_WIDTH
        )
        vi.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            ScreenDimensions.SCREEN_HEIGHT
        )
        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
        mockResourceHandler.areAllResourcesLoaded = vi
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValue(true)
        mockResourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })
        titleScreen = new TitleScreen({
            version: "TEST",
        })
        titleScreenState = titleScreen.setup()
        gameEngineState = GameEngineStateService.new({
            titleScreenState,
            resourceHandler: mockResourceHandler,
        })

        const playerDataMessageListener: PlayerDataMessageListener =
            new PlayerDataMessageListener("listener")
        gameEngineState.messageBoard.addListener(
            playerDataMessageListener,
            MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
        )
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: ScreenDimensions.SCREEN_WIDTH,
            height: ScreenDimensions.SCREEN_HEIGHT,
        })
    })

    it("will setup when called and generate a state", () => {
        expect(titleScreenState).not.toBeUndefined()
    })

    it("will declare itself complete when all resources finish loading and user clicks and releases on the start button and the button is drawn active", () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()

        const startGameButton: Button =
            DataBlobService.get<TitleScreenUIObjects>(
                titleScreen.data,
                "uiObjects"
            ).startGameButton

        titleScreen.mousePressed(gameEngineState, {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(startGameButton.getArea()),
            y: RectAreaService.centerY(startGameButton.getArea()),
        })

        expect(
            expectTitleScreenToStartLoadingWhenResourcesAreReady({
                mockedP5GraphicsContext: mockedP5GraphicsContext,
                titleScreen: titleScreen,
                gameEngineState: gameEngineState,
            })
        ).toBeTruthy()
    })

    it("will declare itself complete when the user presses the enter key", () => {
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: ScreenDimensions.SCREEN_WIDTH,
            height: ScreenDimensions.SCREEN_HEIGHT,
        })

        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.keyPressed(
            gameEngineState,
            PlayerInputTestService.pressAcceptKey().keyCode
        )

        expect(
            expectTitleScreenToStartLoadingWhenResourcesAreReady({
                mockedP5GraphicsContext: mockedP5GraphicsContext,
                titleScreen: titleScreen,
                gameEngineState: gameEngineState,
            })
        ).toBeTruthy()
    })

    it("will declare itself complete when the file has loaded and control returns to the title screen", () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(titleScreen.data, "context")
        LoadSaveStateService.userRequestsLoad(context.fileState.loadSaveState)
        LoadSaveStateService.applicationCompletesLoad(
            context.fileState.loadSaveState,
            undefined
        )
        DataBlobService.add<TitleScreenContext>(
            titleScreen.data,
            "context",
            context
        )
        expect(
            expectTitleScreenToStartLoadingWhenResourcesAreReady({
                mockedP5GraphicsContext: mockedP5GraphicsContext,
                titleScreen: titleScreen,
                gameEngineState: gameEngineState,
            })
        ).toBeTruthy()
    })

    it("will upon completion recommend the loading battle state", () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const recommendation =
            titleScreen.recommendStateChanges(gameEngineState)
        expect(recommendation.nextMode).toBe(GameModeEnum.LOADING_BATTLE)
    })

    it("after resetting it will not immediately complete", () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const spy = vi
            .spyOn(titleScreen, "hasCompleted")
            .mockReturnValueOnce(true)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
        spy.mockClear()
        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
    })

    it("will update the start game button if the window is too small", () => {
        const [mockedWidth, mockedHeight] = [
            ScreenDimensions.SCREEN_WIDTH / 2,
            ScreenDimensions.SCREEN_HEIGHT / 2,
        ]
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: mockedWidth,
            height: mockedHeight,
        })
        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
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
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: mockedWidth,
            height: mockedHeight,
        })
        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
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
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: mockedWidth,
            height: mockedHeight,
        })
        titleScreen.reset(gameEngineState)
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: ScreenDimensions.SCREEN_WIDTH,
            height: ScreenDimensions.SCREEN_HEIGHT,
        })

        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(textSpy).toBeCalledWith(
            "START: click here / press enter",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    describe("user clicks the load button", () => {
        it("should ignore other inputs while loading", () => {
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            mousePressContinueButton(titleScreen, gameEngineState)
            expect(titleScreen.newGameSelected).toBeFalsy()

            titleScreen.mousePressed(gameEngineState, {
                button: MouseButton.ACCEPT,
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT - 1,
            })
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
                    loadSaveStateChange,
                    expectedSaveStateField,
                    expectedErrorMessage,
                }) => {
                    vi.spyOn(Date, "now").mockReturnValue(0)
                    const loadGame = vi.spyOn(
                        gameEngineState.messageBoard,
                        "sendMessage"
                    )
                    titleScreen.update(gameEngineState, mockedP5GraphicsContext)
                    mousePressContinueButton(titleScreen, gameEngineState)
                    loadSaveStateChange(gameEngineState.fileState.loadSaveState)

                    const textSpy = vi.spyOn(
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

                    vi.spyOn(Date, "now").mockReturnValue(
                        TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION
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
            vi.spyOn(Date, "now").mockReturnValue(0)
            const loadGame = vi.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            mousePressContinueButton(titleScreen, gameEngineState)
            gameEngineState.fileState.loadSaveState.applicationErroredWhileLoading =
                true

            const textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
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

            vi.spyOn(Date, "now").mockReturnValue(
                TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION
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
            titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            mousePressContinueButton(titleScreen, gameEngineState)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            const resourcesSpy = vi
                .spyOn(titleScreen, "allResourcesAreLoaded")
                .mockReturnValue(true)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
            expect(
                titleScreen.recommendStateChanges(gameEngineState).nextMode
            ).toBe(GameModeEnum.LOADING_BATTLE)
            expect(resourcesSpy).toBeCalled()
            resourcesSpy.mockRestore()
        })
    })

    it("will show the version", () => {
        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
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

const expectTitleScreenToStartLoadingWhenResourcesAreReady = ({
    mockedP5GraphicsContext,
    titleScreen,
    gameEngineState,
}: {
    mockedP5GraphicsContext: MockedP5GraphicsBuffer
    titleScreen: TitleScreen
    gameEngineState: GameEngineState
}) => {
    expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
    const resourcesSpy = vi
        .spyOn(titleScreen, "allResourcesAreLoaded")
        .mockReturnValue(true)
    let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
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
    expect(resourcesSpy).toBeCalled()
    resourcesSpy.mockRestore()
    return true
}

const mousePressContinueButton = (
    titleScreen: TitleScreen,
    gameEngineState: GameEngineState
) => {
    const continueGameButton: Button = DataBlobService.get<{
        continueGameButton: Button
    }>(titleScreen.data, "uiObjects").continueGameButton
    titleScreen.mousePressed(gameEngineState, {
        button: MouseButton.ACCEPT,
        x: RectAreaService.centerX(continueGameButton.getArea()),
        y: RectAreaService.centerY(continueGameButton.getArea()),
    })
}
