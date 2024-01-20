import {SplashScreenPlayerService} from "./splashScreenPlayer";
import {SplashScreenService} from "./splashScreen";

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
});
