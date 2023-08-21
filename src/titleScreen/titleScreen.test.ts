import * as mocks from "../utils/test/mocks";
import {TitleScreen} from "./titleScreen";
import {TitleScreenState} from "./titleScreenState";
import p5 from "p5";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {KeyButtonName} from "../utils/keyboardConfig";
import {config} from "../configuration/config";
import {ResourceHandler} from "../resource/resourceHandler";
import {makeResult} from "../utils/ResultOrError";

describe('Title Screen', () => {
    let titleScreen: TitleScreen;
    let titleScreenState: TitleScreenState
    let mockedP5: p5;
    let mockResourceHandler: ResourceHandler;

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));
        titleScreen = new TitleScreen({resourceHandler: mockResourceHandler});
        titleScreenState = titleScreen.setup({graphicsContext: mockedP5});
    });

    it('will setup when called and generate a state', () => {
        expect(titleScreenState).not.toBeUndefined();
    });

    it('will declare itself complete when the user clicks on the start button and the button is drawn active', () => {
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.mouseClicked(titleScreenState, MouseButton.LEFT, ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT - 1);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        let textSpy = jest.spyOn(mockedP5, "text");
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will declare itself complete when the user presses the enter key', () => {
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.keyPressed(titleScreenState, config.KEYBOARD_SHORTCUTS[KeyButtonName.ACCEPT][0]);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        let textSpy = jest.spyOn(mockedP5, "text");
        titleScreen.update(titleScreenState, mockedP5);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will upon completion recommend the battle state', () => {
        jest.spyOn(titleScreen, 'hasCompleted').mockReturnValue(true);
        titleScreen.update(titleScreenState, mockedP5);
        const recommendation = titleScreen.recommendStateChanges(titleScreenState);
        expect(recommendation.nextMode).toBe(GameModeEnum.BATTLE);
    });
});
