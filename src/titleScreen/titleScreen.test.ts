import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {TitleScreen} from "./titleScreen";
import {TitleScreenState} from "./titleScreenState";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {KeyButtonName} from "../utils/keyboardConfig";
import {config} from "../configuration/config";
import {ResourceHandler} from "../resource/resourceHandler";
import {makeResult} from "../utils/ResultOrError";


describe('Title Screen', () => {
    let titleScreen: TitleScreen;
    let titleScreenState: TitleScreenState
    let mockResourceHandler: ResourceHandler;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(ScreenDimensions.SCREEN_WIDTH);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(ScreenDimensions.SCREEN_HEIGHT);
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));
        titleScreen = new TitleScreen({resourceHandler: mockResourceHandler});
        titleScreenState = titleScreen.setup();
    });

    it('will setup when called and generate a state', () => {
        expect(titleScreenState).not.toBeUndefined();
    });

    it('will declare itself complete when the user clicks on the start button and the button is drawn active', () => {
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.mouseClicked(titleScreenState, MouseButton.LEFT, ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT - 1);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will declare itself complete when the user presses the enter key', () => {
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(ScreenDimensions.SCREEN_WIDTH);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(ScreenDimensions.SCREEN_HEIGHT);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        titleScreen.keyPressed(titleScreenState, config.KEYBOARD_SHORTCUTS[KeyButtonName.ACCEPT][0]);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeFalsy();
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(titleScreenState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will upon completion recommend the battle state', () => {
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);
        const recommendation = titleScreen.recommendStateChanges(titleScreenState);
        expect(recommendation.nextMode).toBe(GameModeEnum.BATTLE);
    });

    it('after resetting it will not immediately complete', () => {
        const spy = jest.spyOn(titleScreen, 'hasCompleted').mockReturnValueOnce(true);
        expect(titleScreen.hasCompleted(titleScreen)).toBeTruthy();
        spy.mockClear();
        titleScreen.reset(titleScreenState);
        expect(titleScreen.hasCompleted(titleScreen)).toBeFalsy();
    });

    it('will update the start game button if the window is too small', () => {
        const [mockedWidth, mockedHeight] = [ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT / 2];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.reset(titleScreenState);
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);

        const expectedButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${mockedWidth}x${mockedHeight}`;
        expect(textSpy).toBeCalledWith(expectedButtonLabel, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will say the window is too small if the window is too small', () => {
        const [mockedWidth, mockedHeight] = [1, 1];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.reset(titleScreenState);
        titleScreen.update(titleScreenState, mockedP5GraphicsContext);

        const expectedButtonLabel = `Window is too small`;
        expect(textSpy).toBeCalledWith(expectedButtonLabel, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });
});
