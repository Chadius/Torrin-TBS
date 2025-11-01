import {
    SplashScreenPlayerService,
    SplashScreenPlayerState,
} from "./splashScreenPlayer"
import { SplashScreen, SplashScreenService } from "./splashScreen"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputTestService } from "../utils/test/playerInput"
import { PlayerInputStateService } from "../ui/playerInput/playerInputState"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../resource/resourceRepository.ts"
import { TestLoadImmediatelyImageLoader } from "../resource/resourceRepositoryTestUtils.ts"
import { LoadCampaignData } from "../utils/fileHandling/loadCampaignData.ts"

describe("splash screen", () => {
    let resourceRepository: ResourceRepository
    beforeEach(() => {
        let loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })
    })

    describe("splash screen finishes", () => {
        let titleScreenData: SplashScreen
        let player: SplashScreenPlayerState
        beforeEach(() => {
            titleScreenData = SplashScreenService.new({
                id: "1",
                screenImageResourceKey: "titleScreen",
            })

            player = SplashScreenPlayerService.new({
                splashScreen: titleScreenData,
            })
        })

        it("should mark as finished if clicked", () => {
            const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)
            SplashScreenPlayerService.start(player)
            expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy()
            expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy()

            SplashScreenPlayerService.mouseClicked(player)

            expect(SplashScreenPlayerService.isAnimating(player)).toBeFalsy()
            expect(SplashScreenPlayerService.isFinished(player)).toBeTruthy()
            expect(dateSpy).toBeCalled()
            dateSpy.mockRestore()
        })

        it("should mark as finished if accept key is pressed", () => {
            SplashScreenPlayerService.start(player)
            expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy()
            expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy()

            SplashScreenPlayerService.keyPressed({
                splashScreenPlayerState: player,
                event: PlayerInputTestService.pressAcceptKey(),
                playerInputState: PlayerInputStateService.newFromEnvironment(),
            })

            expect(SplashScreenPlayerService.isAnimating(player)).toBeFalsy()
            expect(SplashScreenPlayerService.isFinished(player)).toBeTruthy()
        })
    })

    it("should ignore input until the animation Duration passes", () => {
        const titleScreenData = SplashScreenService.new({
            id: "1",
            screenImageResourceKey: "titleScreen",
            animationDuration: 500,
        })

        const player = SplashScreenPlayerService.new({
            splashScreen: titleScreenData,
        })

        vi.spyOn(Date, "now").mockImplementation(() => 0)
        SplashScreenPlayerService.start(player)
        expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy()
        expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy()

        SplashScreenPlayerService.mouseClicked(player)
        expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy()
        expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy()

        vi.spyOn(Date, "now").mockImplementation(() => 501)
        SplashScreenPlayerService.mouseClicked(player)

        expect(SplashScreenPlayerService.isAnimating(player)).toBeFalsy()
        expect(SplashScreenPlayerService.isFinished(player)).toBeTruthy()
    })

    describe("backgroundColor", () => {
        let drawRectSpy: MockInstance
        let mockedP5GraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
            drawRectSpy = vi.spyOn(mockedP5GraphicsContext, "rect")
        })

        afterEach(() => {
            drawRectSpy.mockRestore()
        })

        it("will draw the background when it is set", () => {
            const splashWithBackgroundState = SplashScreenService.new({
                id: "splash",
                screenImageResourceKey: "backgroundScreen",
                backgroundColor: [1, 2, 3],
            })

            const splashPlayerState = SplashScreenPlayerService.new({
                splashScreen: splashWithBackgroundState,
            })

            SplashScreenPlayerService.draw({
                splashScreenPlayerState: splashPlayerState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository,
            })
            expect(drawRectSpy).toBeCalled()
            expect(drawRectSpy).toBeCalledWith(
                0,
                0,
                ScreenDimensions.SCREEN_WIDTH,
                ScreenDimensions.SCREEN_HEIGHT
            )
        })

        it("will not draw the background when it is not set", () => {
            const splashWithoutBackgroundState = SplashScreenService.new({
                id: "splash",
                screenImageResourceKey: "backgroundScreen",
            })

            const splashPlayerState = SplashScreenPlayerService.new({
                splashScreen: splashWithoutBackgroundState,
            })

            SplashScreenPlayerService.draw({
                splashScreenPlayerState: splashPlayerState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository,
            })
            expect(drawRectSpy).not.toBeCalled()
        })
    })
})
