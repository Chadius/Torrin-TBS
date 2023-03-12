import {SplashScreen} from "./splashScreen";

describe('splash screen', () => {
    it('should mark as finished if clicked', () => {
        const titleScreen = new SplashScreen({id: "1"});

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        titleScreen.start();
        expect(titleScreen.isAnimating()).toBeTruthy();
        expect(titleScreen.isFinished()).toBeFalsy();

        titleScreen.mouseClicked(100, 100);

        expect(titleScreen.isAnimating()).toBeFalsy();
        expect(titleScreen.isFinished()).toBeTruthy();
    });

    it('should ignore input until the animation Duration passes', () => {
        const titleScreen = new SplashScreen({id: "1", animationDuration: 500});

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        titleScreen.start();
        expect(titleScreen.isAnimating()).toBeTruthy();
        expect(titleScreen.isFinished()).toBeFalsy();

        titleScreen.mouseClicked(100, 100);
        expect(titleScreen.isAnimating()).toBeTruthy();
        expect(titleScreen.isFinished()).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 501);
        titleScreen.mouseClicked(100, 100);

        expect(titleScreen.isAnimating()).toBeFalsy();
        expect(titleScreen.isFinished()).toBeTruthy();
    });
});
