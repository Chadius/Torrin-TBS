import * as mocks from "../utils/test/mocks";
import {GameEngine} from "./gameEngine";

describe('Game Engine', () => {
    let mockedP5 = mocks.mockedP5();

    it('creates a BattleOrchestrator and state upon setup', () => {
        const newGameEngine: GameEngine = new GameEngine({graphicsContext: mockedP5});
        newGameEngine.setup();
        expect(newGameEngine.battleOrchestrator).not.toBeUndefined();
        expect(newGameEngine.battleOrchestratorState).not.toBeUndefined();
    });

    it('calls draw function on battle orchestrator when it draws', () => {
        const newGameEngine: GameEngine = new GameEngine({graphicsContext: mockedP5});
        newGameEngine.setup();
        const spy = jest.spyOn(newGameEngine.battleOrchestrator, "update");

        newGameEngine.draw();
        expect(spy).toBeCalledWith(newGameEngine.battleOrchestratorState, mockedP5);
    });

    it('calls keyPressed when a key is pressed', () => {
        const newGameEngine: GameEngine = new GameEngine({graphicsContext: mockedP5});
        newGameEngine.setup();
        const spy = jest.spyOn(newGameEngine.battleOrchestrator, "keyPressed").mockImplementation(() => {});
        newGameEngine.keyPressed(10);
        expect(spy).toBeCalledWith(newGameEngine.battleOrchestratorState, 10);
    });

    it('calls mouseClicked when the mouse is clicked', () => {
        const newGameEngine: GameEngine = new GameEngine({graphicsContext: mockedP5});
        newGameEngine.setup();
        const spy = jest.spyOn(newGameEngine.battleOrchestrator, "mouseClicked").mockImplementation(() => {});
        newGameEngine.mouseClicked("LEFT", 100, 200);
        expect(spy).toBeCalledWith(newGameEngine.battleOrchestratorState, 100, 200);
    });

    it('calls mouseClicked when the mouse is moved', () => {
        const newGameEngine: GameEngine = new GameEngine({graphicsContext: mockedP5});
        newGameEngine.setup();
        const spy = jest.spyOn(newGameEngine.battleOrchestrator, "mouseMoved").mockImplementation(() => {});
        newGameEngine.mouseMoved(100, 200);
        expect(spy).toBeCalledWith(newGameEngine.battleOrchestratorState, 100, 200);
    });
});
