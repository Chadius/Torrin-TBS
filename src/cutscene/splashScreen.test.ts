import {SplashScreenService} from "./splashScreen";

describe('Splash Screen', () => {
    it('new will sanitize the fields', () => {
        const splashData = SplashScreenService.new({
            id: "splash screen data",
            screenImageResourceKey: "title screen",
        });

        expect(splashData.animationDuration).toEqual(0);
    });
});
