import {SplashScreenPlayerService} from "./splashScreenPlayer";
import {SplashScreenService} from "./splashScreen";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";

describe('splash screen', () => {
    it('should mark as finished if clicked', () => {
        const titleScreenData = SplashScreenService.new({
            id: "1",
            screenImageResourceKey: "titleScreen",
        });

        const player = SplashScreenPlayerService.new({
            splashScreen: titleScreenData,
        });

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        SplashScreenPlayerService.start(player, {});
        expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy();
        expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy();

        SplashScreenPlayerService.mouseClicked(player, 100, 100);

        expect(SplashScreenPlayerService.isAnimating(player)).toBeFalsy();
        expect(SplashScreenPlayerService.isFinished(player)).toBeTruthy();
    });

    it('should ignore input until the animation Duration passes', () => {
        const titleScreenData = SplashScreenService.new({
            id: "1",
            screenImageResourceKey: "titleScreen",
            animationDuration: 500,
        });

        const player = SplashScreenPlayerService.new({
            splashScreen: titleScreenData,
        });

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        SplashScreenPlayerService.start(player, {});
        expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy();
        expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy();

        SplashScreenPlayerService.mouseClicked(player, 100, 100);
        expect(SplashScreenPlayerService.isAnimating(player)).toBeTruthy();
        expect(SplashScreenPlayerService.isFinished(player)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 501);
        SplashScreenPlayerService.mouseClicked(player, 100, 100);

        expect(SplashScreenPlayerService.isAnimating(player)).toBeFalsy();
        expect(SplashScreenPlayerService.isFinished(player)).toBeTruthy();
    });

    describe('backgroundColor', () => {
        let drawRectSpy: jest.SpyInstance;
        let mockedP5GraphicsContext: MockedP5GraphicsContext;

        beforeEach(() => {
            mockedP5GraphicsContext = new MockedP5GraphicsContext();
            drawRectSpy = jest.spyOn(mockedP5GraphicsContext, "rect");
        });

        afterEach(() => {
            drawRectSpy.mockRestore();
        });

        it('will draw the background when it is set', () => {
            const splashWithBackgroundState = SplashScreenService.new({
                id: "splash",
                screenImageResourceKey: "backgroundScreen",
                backgroundColor: [1, 2, 3],
            });

            const splashPlayerState = SplashScreenPlayerService.new({
                splashScreen: splashWithBackgroundState
            });

            SplashScreenPlayerService.draw(splashPlayerState, mockedP5GraphicsContext);
            expect(drawRectSpy).toBeCalled();
            expect(drawRectSpy).toBeCalledWith(0, 0, ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        });

        it('will not draw the background when it is not set', () => {
            const splashWithoutBackgroundState = SplashScreenService.new({
                id: "splash",
                screenImageResourceKey: "backgroundScreen",
            });

            const splashPlayerState = SplashScreenPlayerService.new({
                splashScreen: splashWithoutBackgroundState
            });

            SplashScreenPlayerService.draw(splashPlayerState, mockedP5GraphicsContext);
            expect(drawRectSpy).not.toBeCalled();
        });
    });
});
