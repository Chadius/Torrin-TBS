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
import {FILE_MESSAGE_DISPLAY_DURATION} from "../battle/battleSquaddieSelectedHUD";
import {RectAreaHelper} from "../ui/rectArea";
import {GameEngineState, GameEngineStateHelper} from "../gameEngine/gameEngine";


describe('Title Screen', () => {
    let gameEngineState: GameEngineState;
    let titleScreen: TitleScreen;
    let titleScreenState: TitleScreenState
    let mockResourceHandler: ResourceHandler;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(ScreenDimensions.SCREEN_WIDTH);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(ScreenDimensions.SCREEN_HEIGHT);
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true);
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));
        titleScreen = new TitleScreen({resourceHandler: mockResourceHandler});
        titleScreenState = titleScreen.setup();
        gameEngineState = GameEngineStateHelper.new({
            titleScreenState,
            resourceHandler: mockResourceHandler,
        })
    });

    it('will setup when called and generate a state', () => {
        expect(titleScreenState).not.toBeUndefined();
    });

    it('will declare itself complete when the user clicks on the start button and the button is drawn active', () => {
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
        titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT - 1);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will declare itself complete when the user presses the enter key', () => {
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(ScreenDimensions.SCREEN_WIDTH);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(ScreenDimensions.SCREEN_HEIGHT);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
        titleScreen.keyPressed(gameEngineState, config.KEYBOARD_SHORTCUTS[KeyButtonName.ACCEPT][0]);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will upon completion recommend the loading battle state', () => {
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        const recommendation = titleScreen.recommendStateChanges(gameEngineState);
        expect(recommendation.nextMode).toBe(GameModeEnum.LOADING_BATTLE);
    });

    it('after resetting it will not immediately complete', () => {
        const spy = jest.spyOn(titleScreen, 'hasCompleted').mockReturnValueOnce(true);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
        spy.mockClear();
        titleScreen.reset(gameEngineState);
        expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
    });

    it('will update the start game button if the window is too small', () => {
        const [mockedWidth, mockedHeight] = [ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT / 2];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.reset(gameEngineState);
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);

        const expectedButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${mockedWidth}x${mockedHeight}`;
        expect(textSpy).toBeCalledWith(expectedButtonLabel, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will say the window is too small if the window is too small', () => {
        const [mockedWidth, mockedHeight] = [1, 1];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);
        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.reset(gameEngineState);
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);

        const expectedButtonLabel = `Window is too small`;
        expect(textSpy).toBeCalledWith(expectedButtonLabel, expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will reset the screen size warning if the window is restored', () => {
        const [mockedWidth, mockedHeight] = [1, 1];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);
        titleScreen.reset(gameEngineState);
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);

        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(ScreenDimensions.SCREEN_WIDTH);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(ScreenDimensions.SCREEN_HEIGHT);

        let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(textSpy).toBeCalledWith("Click here to Play Demo", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it('will gather resources once upon startup', () => {
        const [mockedWidth, mockedHeight] = [1, 1];
        jest.spyOn(mockedP5GraphicsContext, 'windowWidth').mockReturnValue(mockedWidth);
        jest.spyOn(mockedP5GraphicsContext, 'windowHeight').mockReturnValue(mockedHeight);

        mockResourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true);
        const isResourceLoadedMock = jest.spyOn(mockResourceHandler, "isResourceLoaded");

        titleScreen.reset(gameEngineState);
        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        const resourceCallCount = isResourceLoadedMock.mock.calls.length;
        expect(mockResourceHandler.isResourceLoaded).toBeCalledTimes(resourceCallCount);

        titleScreen.update(gameEngineState, mockedP5GraphicsContext);
        expect(mockResourceHandler.isResourceLoaded).toBeCalledTimes(resourceCallCount);
    });

    describe('user clicks the load button', () => {
        beforeEach(() => {
        });
        it('will begin the loading process when the user clicks the button', () => {
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
            const loadGame = jest.spyOn(titleScreen, "markGameToBeLoaded");
            titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, RectAreaHelper.centerX(titleScreen.continueGameButton.readyLabel.textBox.area), RectAreaHelper.centerY(titleScreen.continueGameButton.readyLabel.textBox.area));
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
            expect(loadGame).toBeCalled();

            expect(gameEngineState.gameSaveFlags.loadRequested).toBeTruthy();

            let textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            expect(textSpy).toBeCalled();
            expect(textSpy).toBeCalledWith("Now loading...", expect.anything(), expect.anything(), expect.anything(), expect.anything());
        });
        it('should ignore other inputs while loading', () => {
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, RectAreaHelper.centerX(titleScreen.continueGameButton.readyLabel.textBox.area), RectAreaHelper.centerY(titleScreen.continueGameButton.readyLabel.textBox.area));
            expect(titleScreen.newGameSelected).toBeFalsy();

            titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT - 1);
            expect(titleScreen.newGameSelected).toBeFalsy();
        });
        it('should show a failure message if the load failed', () => {
            jest.spyOn(Date, "now").mockReturnValue(0);
            const loadGame = jest.spyOn(titleScreen, "markGameToBeLoaded");
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, RectAreaHelper.centerX(titleScreen.continueGameButton.readyLabel.textBox.area), RectAreaHelper.centerY(titleScreen.continueGameButton.readyLabel.textBox.area));
            gameEngineState.gameSaveFlags.errorDuringLoading = true;

            const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);

            expect(loadGame).toBeCalled();
            expect(textSpy).toBeCalled();
            expect(textSpy).toBeCalledWith(expect.stringMatching(`Loading failed. Check logs.`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
            expect(gameEngineState.gameSaveFlags.errorDuringLoading).toBeFalsy();

            jest.spyOn(Date, "now").mockReturnValue(FILE_MESSAGE_DISPLAY_DURATION);
            textSpy.mockClear();
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            expect(textSpy).not.toBeCalledWith(expect.stringMatching(`Loading failed. Check logs.`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
        });
        it('should mark as completed and recommend the battle loader', () => {
            expect(titleScreen.hasCompleted(gameEngineState)).toBeFalsy();
            titleScreen.update(gameEngineState, mockedP5GraphicsContext);
            titleScreen.mouseClicked(gameEngineState, MouseButton.LEFT, RectAreaHelper.centerX(titleScreen.continueGameButton.readyLabel.textBox.area), RectAreaHelper.centerY(titleScreen.continueGameButton.readyLabel.textBox.area));
            expect(titleScreen.hasCompleted(gameEngineState)).toBeTruthy();
            expect(titleScreen.recommendStateChanges(gameEngineState).nextMode).toBe(
                GameModeEnum.LOADING_BATTLE
            );
        });
    });


});
