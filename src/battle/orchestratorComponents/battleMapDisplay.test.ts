import {BattleMapDisplay} from "./battleMapDisplay";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCamera} from "../battleCamera";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {OrchestratorComponentMouseEventType} from "../orchestrator/battleOrchestratorComponent";
import {Rectangle} from "../../ui/rectangle";
import {RectArea} from "../../ui/rectArea";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";

describe('battleMapDisplay', () => {
    let battleMapDisplay: BattleMapDisplay;
    let battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    let squaddieRepo: BattleSquaddieRepository;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        battleSquaddieSelectedHUD = mocks.battleSquaddieSelectedHUD();

        squaddieRepo = new (<new (options: any) => BattleSquaddieRepository>BattleSquaddieRepository)({}) as jest.Mocked<BattleSquaddieRepository>;
        squaddieRepo.getDynamicSquaddieIterator = jest.fn().mockReturnValue([]);

        battleMapDisplay = new BattleMapDisplay();

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('will move the camera if the mouse is near the edge of the screen', () => {
        const initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
        let camera = new BattleCamera(...initialCameraCoordinates);
        camera.setXVelocity = jest.fn();
        camera.setYVelocity = jest.fn();

        const state = new BattleOrchestratorState({
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
        let state: BattleOrchestratorState;
        let camera: BattleCamera;
        let initialCameraCoordinates: number[];

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
            camera = new BattleCamera(...initialCameraCoordinates)

            state = new BattleOrchestratorState({
                camera,
                squaddieRepository: squaddieRepo,
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
            battleMapDisplay.draw(state, mockedP5GraphicsContext);
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
            battleMapDisplay.draw(state, mockedP5GraphicsContext);
            expect(camera.getCoordinates()[0]).toBeCloseTo((destinationCoordinates[0]));
            expect(camera.getCoordinates()[1]).toBeCloseTo((destinationCoordinates[1]));
        });
    });

    describe('it will change the camera velocity based on the mouse location', () => {
        let state: BattleOrchestratorState;
        let camera: BattleCamera;
        let initialCameraCoordinates: number[];

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
            camera = new BattleCamera(...initialCameraCoordinates)
            battleSquaddieSelectedHUD.isMouseInsideHUD = jest.fn().mockReturnValue(false);
            battleSquaddieSelectedHUD.shouldDrawTheHUD = jest.fn().mockReturnValue(false);

            state = new BattleOrchestratorState({
                camera,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD,
            });
        });

        type CameraTest = {
            cameraDescription: string,
            mouseX: number,
            mouseY: number,
            cameraVelocityTest: (camera: BattleCamera) => boolean,
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] < 0,
            },
            {
                cameraDescription: "move right",
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] > 0,
            },
            {
                cameraDescription: "move up",
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: 0,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[1] < 0,
            },
            {
                cameraDescription: "move down",
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[1] > 0,
            },
        ];

        it.each(tests)(`moving mouse to ($mouseX, $mouseY) will make the camera $cameraDescription`, ({
                                                                                                          cameraDescription,
                                                                                                          mouseX,
                                                                                                          mouseY,
                                                                                                          cameraVelocityTest
                                                                                                      }) => {
            battleMapDisplay.moveCameraBasedOnMouseMovement(state, mouseX, mouseY);
            expect(cameraVelocityTest(camera)).toBeTruthy();
        });
    });

    describe('will not vertically scroll the camera if the HUD is open', () => {
        let state: BattleOrchestratorState;
        let camera: BattleCamera;
        let initialCameraCoordinates: number[];

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
            camera = new BattleCamera(...initialCameraCoordinates)

            state = new BattleOrchestratorState({
                camera,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD,
            });
        });

        type CameraTest = {
            cameraDescription: string,
            mouseY: number,
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move up",
                mouseY: 0,
            },
            {
                cameraDescription: "move down",
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
        ];

        const hudIsOpen = mocks.battleSquaddieSelectedHUD();
        hudIsOpen.isMouseInsideHUD = jest.fn().mockReturnValue(true);
        jest.spyOn(hudIsOpen, "background", "get").mockReturnValue(
            new Rectangle({
                area: new RectArea({
                    left: 10,
                    right: ScreenDimensions.SCREEN_WIDTH - 10,
                    top: 0,
                    bottom: ScreenDimensions.SCREEN_HEIGHT
                })
            })
        );

        const stateWithOpenedHUD = new BattleOrchestratorState({
            camera,
            squaddieRepository: squaddieRepo,
            battleSquaddieSelectedHUD: hudIsOpen,
        });

        it.each(tests)(`when hovering over the HUD at mouseY $mouseY, do not move the camera`, ({mouseY}) => {
            stateWithOpenedHUD.camera.setXVelocity(0);
            stateWithOpenedHUD.camera.setYVelocity(0);
            hudIsOpen.createWindowPosition(mouseY);
            battleMapDisplay.moveCameraBasedOnMouseMovement(stateWithOpenedHUD, ScreenDimensions.SCREEN_WIDTH / 2, mouseY);
            expect(stateWithOpenedHUD.camera.getVelocity()[1]).toBe(0);
        });
    });

    describe('will horizontally scroll the camera if the HUD is open but only at the extreme edge', () => {
        let state: BattleOrchestratorState;
        let camera: BattleCamera;
        let initialCameraCoordinates: number[];

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT];
            camera = new BattleCamera(...initialCameraCoordinates)

            state = new BattleOrchestratorState({
                camera,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD,
            });
        });

        type CameraTest = {
            cameraDescription: string,
            mouseX: number,
            cameraVelocityTest: (camera: BattleCamera) => boolean,
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseX: 0,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] < 0,
            },
            {
                cameraDescription: "move right",
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] > 0,
            },
            {
                cameraDescription: "not move",
                mouseX: 10,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] === 0,
            },
            {
                cameraDescription: "move down",
                mouseX: ScreenDimensions.SCREEN_WIDTH - 10,
                cameraVelocityTest: (camera: BattleCamera) => camera.getVelocity()[0] === 0,
            },
        ];

        const hudIsOpen = mocks.battleSquaddieSelectedHUD();
        hudIsOpen.isMouseInsideHUD = jest.fn().mockReturnValue(true);
        jest.spyOn(hudIsOpen, "background", "get").mockReturnValue(
            new Rectangle({
                area: new RectArea({
                    left: 10,
                    right: ScreenDimensions.SCREEN_WIDTH - 10,
                    top: 0,
                    bottom: ScreenDimensions.SCREEN_HEIGHT
                })
            })
        );

        const stateWithOpenedHUD = new BattleOrchestratorState({
            camera,
            squaddieRepository: squaddieRepo,
            battleSquaddieSelectedHUD: hudIsOpen,
        });

        it.each(tests)(`when hovering over the HUD at mouseX $mouseX, the camera should $cameraDescription`, ({
                                                                                                                  cameraDescription,
                                                                                                                  mouseX,
                                                                                                                  cameraVelocityTest
                                                                                                              }) => {
            stateWithOpenedHUD.camera.setXVelocity(0);
            stateWithOpenedHUD.camera.setYVelocity(0);
            hudIsOpen.createWindowPosition(ScreenDimensions.SCREEN_HEIGHT / 2);
            battleMapDisplay.moveCameraBasedOnMouseMovement(stateWithOpenedHUD, mouseX, ScreenDimensions.SCREEN_HEIGHT / 2);
            expect(cameraVelocityTest(stateWithOpenedHUD.camera)).toBeTruthy();
        });
    });
});
