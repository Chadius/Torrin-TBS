import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {GameEngine, GameEngineComponentState} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {TitleScreen} from "../titleScreen/titleScreen";
import {TitleScreenState} from "../titleScreen/titleScreenState";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";

describe('Game Engine', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('Will call the new mode based on the component recommendations', () => {
        const newGameEngine = new GameEngine({
            startupMode: GameModeEnum.TITLE_SCREEN,
            graphicsContext: mockedP5GraphicsContext,
        });
        newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});

        const nextComponent = newGameEngine.component;
        const hasCompletedSpy = jest.spyOn(nextComponent, "hasCompleted").mockReturnValue(true);
        const recommendedSpy = jest.spyOn(nextComponent, "recommendStateChanges").mockReturnValue({nextMode: GameModeEnum.BATTLE});

        newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

        expect(hasCompletedSpy).toBeCalled();
        expect(recommendedSpy).toBeCalled();

        expect(newGameEngine.component).toBeInstanceOf(BattleOrchestrator);
    });

    describe('Game Engine component hooks ', () => {
        function expectUpdate(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const updateSpy = jest.spyOn(newGameEngine.component, "update").mockImplementation(() => {
            });
            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(updateSpy).toBeCalled();
            const updateGameEngineComponentState: GameEngineComponentState = updateSpy.mock.calls[0][0];
            expect(updateGameEngineComponentState).toBeInstanceOf(expectedStateType);
        }

        function expectKeyPressed(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const keyPressedSpy = jest.spyOn(newGameEngine.component, "keyPressed").mockImplementation(() => {
            });
            newGameEngine.keyPressed(10);
            expect(keyPressedSpy).toBeCalled();
            const keyPressedGameEngineComponentState: GameEngineComponentState = keyPressedSpy.mock.calls[0][0];
            expect(keyPressedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(keyPressedSpy.mock.calls[0][1]).toBe(10);
        }

        function expectMouseClicked(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const mouseClickedSpy = jest.spyOn(newGameEngine.component, "mouseClicked").mockImplementation(() => {
            });
            newGameEngine.mouseClicked(MouseButton.LEFT, 100, 200);
            expect(mouseClickedSpy).toBeCalled();
            const mouseClickedGameEngineComponentState: GameEngineComponentState = mouseClickedSpy.mock.calls[0][0];
            expect(mouseClickedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(mouseClickedSpy.mock.calls[0][1]).toBe(MouseButton.LEFT);
            expect(mouseClickedSpy.mock.calls[0][2]).toBe(100);
            expect(mouseClickedSpy.mock.calls[0][3]).toBe(200);
        }

        function expectMouseMoved(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const mouseMovedSpy = jest.spyOn(newGameEngine.component, "mouseMoved").mockImplementation(() => {
            });
            newGameEngine.mouseMoved(100, 200);
            expect(mouseMovedSpy).toBeCalled();
            const mouseMovedGameEngineComponentState: GameEngineComponentState = mouseMovedSpy.mock.calls[0][0];
            expect(mouseMovedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(mouseMovedSpy.mock.calls[0][1]).toBe(100);
            expect(mouseMovedSpy.mock.calls[0][2]).toBe(200);
        }

        const loadAndExpect = ({
                                   startupMode,
                                   componentType,
                                   expectedStateType,
                               }: {
            startupMode: GameModeEnum,
            componentType: any,
            expectedStateType: GameEngineComponentState
        }) => {
            const newGameEngine = new GameEngine({
                startupMode,
                graphicsContext: mockedP5GraphicsContext
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.currentMode).toBe(startupMode);
            expect(newGameEngine.component).toBeInstanceOf(componentType);

            expectUpdate(newGameEngine, expectedStateType);
            expectKeyPressed(newGameEngine, expectedStateType);
            expectMouseClicked(newGameEngine, expectedStateType);
            expectMouseMoved(newGameEngine, expectedStateType);
        }

        it('works on title screen', () => {
            loadAndExpect({
                startupMode: GameModeEnum.TITLE_SCREEN,
                componentType: TitleScreen,
                expectedStateType: TitleScreenState,
            })
        });

        it('works on battle mode', () => {
            loadAndExpect({
                startupMode: GameModeEnum.BATTLE,
                componentType: BattleOrchestrator,
                expectedStateType: BattleOrchestratorState,
            })
        });
    });

    describe('save the game', () => {
        it('will save the game if the battle state asks for it', () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.battleOrchestratorState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.gameSaveFlags.saveGame = true;
            const saveSpy = jest.spyOn(SaveFile, "DownloadToBrowser").mockReturnValue(null);

            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.saveGame).toBeFalsy();
        });
    });
});
