import * as mocks from "../utils/test/mocks";
import {TitleScreen} from "./titleScreen";
import {TitleScreenState} from "./titleScreenState";
import p5 from "p5";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {KeyButtonName} from "../utils/keyboardConfig";
import {config} from "../configuration/config";

describe('Title Screen', () => {
    let titleScreen: TitleScreen;
    let titleScreenState: TitleScreenState
    let mockedP5: p5;

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        titleScreen = new TitleScreen();
        titleScreenState = titleScreen.setup({graphicsContext: mockedP5});
    });

    it('will setup when called and generate a state', () => {
        expect(titleScreenState).not.toBeUndefined();
    });

    it('will declare itself complete when the user clicks on the start button', () => {
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.mouseClicked(titleScreenState, MouseButton.LEFT, ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
    });

    it('will declare itself complete when the user presses the enter key', () => {
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.keyPressed(titleScreenState, config.KEYBOARD_SHORTCUTS[KeyButtonName.ACCEPT][0]);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
    });

    it('will upon completion recommend the battle state', () => {
        jest.spyOn(titleScreen, 'hasCompleted').mockReturnValue(true);
        titleScreen.update(titleScreenState, mockedP5);
        const recommendation = titleScreen.recommendStateChanges(titleScreenState);
        expect(recommendation.nextMode).toBe(GameModeEnum.BATTLE);
    });
});
