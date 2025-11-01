import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { TitleScreen, TitleScreenContext } from "./titleScreen"
import { TitleScreenState } from "./titleScreenState"
import { GameModeEnum } from "../utils/startupConfig"
import { MouseButton, ScreenLocation } from "../utils/mouseConfig"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { RectAreaService } from "../ui/rectArea"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../resource/resourceRepository.ts"
import { TestLoadImmediatelyImageLoader } from "../resource/resourceRepositoryTestUtils.ts"
import { LoadCampaignData } from "../utils/fileHandling/loadCampaignData"
import {
    LoadState,
    LoadSaveStateService,
} from "../dataLoader/playerData/loadState"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    Mocked,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputTestService } from "../utils/test/playerInput"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { PlayerDataMessageListener } from "../dataLoader/playerData/playerDataMessageListener"
import { WindowService } from "../utils/graphics/window"
import { TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION } from "./components/continueGameButton"
import p5 from "p5"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngineState/gameEngineState"

describe("Title Screen", () => {
    let gameEngineState: GameEngineState
    let titleScreen: TitleScreen
    let titleScreenState: TitleScreenState
    let resourceRepository: ResourceRepository
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        vi.spyOn(mockedP5GraphicsContext, "width", "get").mockReturnValue(
            ScreenDimensions.SCREEN_WIDTH
        )
        vi.spyOn(mockedP5GraphicsContext, "height", "get").mockReturnValue(
            ScreenDimensions.SCREEN_HEIGHT
        )
        let loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })
        titleScreen = new TitleScreen({
            version: "TEST",
            p5Instance: mocks.mockedP5(),
        })
        titleScreenState = titleScreen.setup()
        gameEngineState = GameEngineStateService.new({
            titleScreenState,
            resourceRepository,
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

    it("will declare itself complete when all resources finish loading and user clicks and releases on the start button and the button is drawn active", async () => {
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()

        const startGameButton = titleScreen.data.getUIObjects().startGameButton

        titleScreen.mousePressed(gameEngineState, {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(startGameButton!.getArea()),
            y: RectAreaService.centerY(startGameButton!.getArea()),
        })

        expect(
            await expectTitleScreenToStartLoadingWhenResourcesAreReady({
                mockedP5GraphicsContext: mockedP5GraphicsContext,
                titleScreen: titleScreen,
                gameEngineState: gameEngineState,
            })
        ).toBeTruthy()
    })

    it("will declare itself complete when the user presses the enter key", async () => {
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: ScreenDimensions.SCREEN_WIDTH,
            height: ScreenDimensions.SCREEN_HEIGHT,
        })

        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
        titleScreen.keyPressed(
            gameEngineState,
            PlayerInputTestService.pressAcceptKey().keyCode
        )

        expect(
            await expectTitleScreenToStartLoadingWhenResourcesAreReady({
                mockedP5GraphicsContext: mockedP5GraphicsContext,
                titleScreen: titleScreen,
                gameEngineState: gameEngineState,
            })
        ).toBeTruthy()
    })

    it("will declare itself complete when the file has loaded and control returns to the title screen", async () => {
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        const context: TitleScreenContext = titleScreen.data.getContext()
        LoadSaveStateService.userRequestsLoad(context!.loadState!)
        LoadSaveStateService.applicationCompletesLoad(
            context!.loadState!,
            undefined
        )
        titleScreen.data.setContext(context)
        expect(
            await expectTitleScreenToStartLoadingWhenResourcesAreReady({
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
        expect(recommendation!.nextMode).toBe(GameModeEnum.LOADING_BATTLE)
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

    it("will update the start game button if the window is too small", async () => {
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
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        const expectedButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${mockedWidth}x${mockedHeight}`
        expect(textSpy).toBeCalledWith(
            expectedButtonLabel,
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will say the window is too small if the window is too small", async () => {
        const [mockedWidth, mockedHeight] = [1, 1]
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: mockedWidth,
            height: mockedHeight,
        })
        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        titleScreen.reset(gameEngineState)
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        const expectedButtonLabel = `Window is too small`
        expect(textSpy).toBeCalledWith(
            expectedButtonLabel,
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it("will reset the screen size warning if the window is restored", async () => {
        const [mockedWidth, mockedHeight] = [1, 1]
        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: mockedWidth,
            height: mockedHeight,
        })
        titleScreen.reset(gameEngineState)
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)

        vi.spyOn(WindowService, "getDimensions").mockReturnValue({
            width: ScreenDimensions.SCREEN_WIDTH,
            height: ScreenDimensions.SCREEN_HEIGHT,
        })

        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        expect(textSpy).toBeCalledWith(
            "START: click here / press enter",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    describe("Anchor Tags to other pages", () => {
        let createASpy: MockInstance
        let anchorTagPositions: ScreenLocation[]

        beforeEach(async () => {
            createASpy = vi
                .spyOn(titleScreen.p5Instance!, "createA")
                .mockReturnValue({
                    position: (x, y) => {
                        if (x != undefined && y != undefined) {
                            anchorTagPositions.push({ x, y })
                        }
                    },
                    remove: () => {},
                } as Mocked<p5.Element>)
            anchorTagPositions = []
            await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
        })

        afterEach(() => {
            if (createASpy) createASpy.mockRestore()
        })

        const linkTests = [
            {
                website: "itch.io",
                externalLinkKey: "itchIo",
            },
        ]

        describe("drawing the page calls the window instance to create an Anchor tag", () => {
            it.each(linkTests)(`$website`, ({ externalLinkKey }) => {
                const layout = titleScreen.data.getLayout()
                expect(createASpy).toHaveBeenCalledWith(
                    layout.externalLinks[externalLinkKey].href,
                    expect.any(String),
                    layout.externalLinks[externalLinkKey].target
                )
            })
        })

        describe("title screen has a reference to the new Anchor tag", () => {
            it.each(linkTests)(`$website`, ({ externalLinkKey }) => {
                expect(
                    titleScreen.data.getUIObjects().externalLinks![
                        externalLinkKey
                    ]
                ).toBeTruthy()
            })
        })

        it("All Anchor tags are in the correct positions", () => {
            const layout = titleScreen.data.getLayout()
            const expectedPositions: ScreenLocation[] = Object.values(
                layout.externalLinks
            ).map((externalLink) => externalLink.screenLocation)
            expect(
                anchorTagPositions.every((position) =>
                    expectedPositions.some(
                        (expectedPosition) =>
                            position.x == expectedPosition.x &&
                            position.y == expectedPosition.y
                    )
                )
            ).toBeTruthy()
        })

        describe("Anchor Tags are removed upon reset", () => {
            it.each(linkTests)(`$website`, ({ externalLinkKey }) => {
                const anchorTag =
                    titleScreen.data.getUIObjects().externalLinks![
                        externalLinkKey
                    ]
                const removeSpy = vi.spyOn(anchorTag!, "remove")
                titleScreen.reset(gameEngineState)
                expect(
                    titleScreen.data.getUIObjects().externalLinks![
                        externalLinkKey
                    ]
                ).toBeFalsy()
                expect(removeSpy).toHaveBeenCalled()
            })
        })
    })

    describe("user clicks the load button", () => {
        it("should ignore other inputs while loading", async () => {
            await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
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
                    loadSaveStateChange: (loadSaveState: LoadState): void => {
                        loadSaveState.applicationErroredWhileLoading = true
                    },
                    expectedSaveStateField: (
                        loadSaveState: LoadState
                    ): boolean => {
                        return loadSaveState.applicationErroredWhileLoading
                    },
                    expectedErrorMessage: `Loading failed. Check logs.`,
                },
                {
                    name: "user cancels",
                    loadSaveStateChange: (loadSaveState: LoadState): void => {
                        loadSaveState.userCanceledLoad = true
                    },
                    expectedSaveStateField: (
                        loadSaveState: LoadState
                    ): boolean => {
                        return loadSaveState.userCanceledLoad
                    },
                    expectedErrorMessage: `Canceled loading.`,
                },
            ]
            it.each(tests)(
                `$name`,
                async ({
                    loadSaveStateChange,
                    expectedSaveStateField,
                    expectedErrorMessage,
                }) => {
                    vi.spyOn(Date, "now").mockReturnValue(0)
                    const loadGame = vi.spyOn(
                        gameEngineState.messageBoard,
                        "sendMessage"
                    )
                    await titleScreen.update(
                        gameEngineState,
                        mockedP5GraphicsContext
                    )
                    mousePressContinueButton(titleScreen, gameEngineState)
                    loadSaveStateChange(gameEngineState.loadState)

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
                        expectedSaveStateField(gameEngineState.loadState)
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
                        expectedSaveStateField(gameEngineState.loadState)
                    ).toBeFalsy()
                }
            )
        })

        it("should show a failure message if the load failed", async () => {
            vi.spyOn(Date, "now").mockReturnValue(0)
            const loadGame = vi.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )
            await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            mousePressContinueButton(titleScreen, gameEngineState)
            gameEngineState.loadState.applicationErroredWhileLoading = true

            const textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
            await titleScreen.update(gameEngineState, mockedP5GraphicsContext)

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
                gameEngineState.loadState.applicationErroredWhileLoading
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
                gameEngineState.loadState.applicationErroredWhileLoading
            ).toBeFalsy()
        })
        it("should mark as completed and recommend the battle loader", async () => {
            await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            mousePressContinueButton(titleScreen, gameEngineState)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy()
            const resourcesSpy = vi
                .spyOn(titleScreen, "allResourcesAreLoaded")
                .mockReturnValue(true)
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy()
            expect(
                titleScreen?.recommendStateChanges(gameEngineState)?.nextMode
            ).toBe(GameModeEnum.LOADING_BATTLE)
            expect(resourcesSpy).toBeCalled()
            resourcesSpy.mockRestore()
        })
    })

    it("will show the version", async () => {
        let textSpy = vi.spyOn(mockedP5GraphicsContext.mockedP5, "text")
        await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
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

const expectTitleScreenToStartLoadingWhenResourcesAreReady = async ({
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
    await titleScreen.update(gameEngineState, mockedP5GraphicsContext)
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
    const continueGameButton =
        titleScreen.data.getUIObjects().continueGameButton
    titleScreen.mousePressed(gameEngineState, {
        button: MouseButton.ACCEPT,
        x: RectAreaService.centerX(continueGameButton!.getArea()),
        y: RectAreaService.centerY(continueGameButton!.getArea()),
    })
}
