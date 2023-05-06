import {BattleMapDisplay} from "./battleMapDisplay";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCamera} from "../battleCamera";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {OrchestratorComponentMouseEventType} from "../orchestrator/orchestratorComponent";
import p5 from "p5";

jest.mock('p5', () => () => {
    return {
        background: jest.fn(),
        colorMode: jest.fn(),
    }
});
describe('battleMapDisplay', () => {
    let battleMapDisplay: BattleMapDisplay;
    let mockedP5: p5;
    let battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    let squaddieRepo: BattleSquaddieRepository;

    beforeEach(() => {
        battleSquaddieSelectedHUD = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
        battleSquaddieSelectedHUD.draw = jest.fn();

        squaddieRepo = new (<new (options: any) => BattleSquaddieRepository>BattleSquaddieRepository)({}) as jest.Mocked<BattleSquaddieRepository>;
        squaddieRepo.getDynamicSquaddieIterator = jest.fn().mockReturnValue([]);

        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;

        battleMapDisplay = new BattleMapDisplay();
    });

    it('will move the camera if the mouse is near the edge of the screen', () => {
        const initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
        let camera = new BattleCamera(...initialCameraCoordinates);
        camera.setXVelocity = jest.fn();
        camera.setYVelocity = jest.fn();

        const state = new OrchestratorState({
            displayMap: true,
            camera,
        });
        battleMapDisplay.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.MOVED,
            mouseX: 0,
            mouseY: 0
        });
        expect(camera.setXVelocity).toBeCalled();
        expect(camera.setYVelocity).toBeCalled();
    });

    describe('panning the camera', () => {
        let state: OrchestratorState;
        let camera: BattleCamera;
        let initialCameraCoordinates: number[];

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
            camera = new BattleCamera(...initialCameraCoordinates)

            state = new OrchestratorState({
                displayMap: true,
                camera,
                squaddieRepo,
                battleSquaddieSelectedHUD,
            });
        });

        it('can pan over to a coordinate, ignoring the mouse location', () => {
            const destinationCoordinates: number[] = [100, -ScreenDimensions.SCREEN_HEIGHT + 200];
            const timeToPan: number = 1000;
            camera.setXVelocity = jest.fn();
            camera.setYVelocity = jest.fn();

            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            });

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan / 2);
            battleMapDisplay.draw(state, mockedP5);
            expect(camera.getCoordinates()[0]).toBeCloseTo((initialCameraCoordinates[0] + destinationCoordinates[0]) / 2);
            expect(camera.getCoordinates()[1]).toBeCloseTo((initialCameraCoordinates[1] + destinationCoordinates[1]) / 2);

            battleMapDisplay.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: 0,
                mouseY: 0
            });
            expect(camera.setXVelocity).not.toBeCalled();
            expect(camera.setYVelocity).not.toBeCalled();

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan);
            battleMapDisplay.draw(state, mockedP5);
            expect(camera.getCoordinates()[0]).toBeCloseTo((destinationCoordinates[0]));
            expect(camera.getCoordinates()[1]).toBeCloseTo((destinationCoordinates[1]));
        });
    });
});
