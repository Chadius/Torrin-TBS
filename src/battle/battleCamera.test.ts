import {BattleCamera} from "./battleCamera";
import {HEX_TILE_WIDTH} from "../graphicsConstants";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {ScreenDimensions} from "../utils/graphicsConfig";

describe('BattleCamera', () => {
    it('can be constrained so it cannot scroll too high up', () => {
        const camera: BattleCamera = new BattleCamera(0, -ScreenDimensions.SCREEN_HEIGHT);
        const numberOfRowsThatCanFitOnScreen = Math.trunc(ScreenDimensions.SCREEN_HEIGHT / HEX_TILE_WIDTH);
        camera.setYVelocity(100);
        camera.setMapDimensionBoundaries(1, numberOfRowsThatCanFitOnScreen + 5);

        camera.constrainCamera();

        expect(camera.getCoordinates()[1]).toBeGreaterThanOrEqual(0 - ScreenDimensions.SCREEN_HEIGHT / 10 + ScreenDimensions.SCREEN_HEIGHT / 2);
        expect(camera.getVelocity()[1]).toBe(0);
    });

    it('can be constrained so it cannot scroll too far down', () => {
        const camera: BattleCamera = new BattleCamera(0, 2 * ScreenDimensions.SCREEN_HEIGHT);
        const numberOfRowsThatCanFitOnScreen = Math.trunc(ScreenDimensions.SCREEN_HEIGHT / HEX_TILE_WIDTH);
        camera.setYVelocity(-100);
        camera.setMapDimensionBoundaries(1, numberOfRowsThatCanFitOnScreen + 5);

        camera.constrainCamera();

        expect(camera.getCoordinates()[1]).toBeLessThanOrEqual((numberOfRowsThatCanFitOnScreen + 5) * HEX_TILE_WIDTH - ScreenDimensions.SCREEN_HEIGHT / 2 + ScreenDimensions.SCREEN_HEIGHT / 10)
        expect(camera.getVelocity()[1]).toBe(0);
    });

    it('no vertical scrolling if the map has only a few rows', () => {
        const camera: BattleCamera = new BattleCamera(0, 2 * ScreenDimensions.SCREEN_HEIGHT);
        camera.setYVelocity(-100);
        camera.setMapDimensionBoundaries(3, 3);

        camera.constrainCamera();

        const bottomOfLastRow: number = convertMapCoordinatesToWorldCoordinates(
            3,
            0,
        )[1];

        expect(camera.getCoordinates()[1]).toBe(bottomOfLastRow / 2)
        expect(camera.getVelocity()[1]).toBe(0);
    });

    it('no horizontal scrolling if the map has only a few columns', () => {
        const camera: BattleCamera = new BattleCamera(2 * ScreenDimensions.SCREEN_WIDTH, 0);
        camera.setXVelocity(-100);
        camera.setMapDimensionBoundaries(3, 3);

        camera.constrainCamera();

        const topLeftTile = convertMapCoordinatesToWorldCoordinates(0, 0);
        const bottomRightTile = convertMapCoordinatesToWorldCoordinates(3, 3);

        expect(camera.getCoordinates()[0]).toBe((topLeftTile[0] + bottomRightTile[0]) / 2);
        expect(camera.getVelocity()[0]).toBe(0);
    });

    it('can be constrained so it cannot scroll too far to the left', () => {
        const worldLocationOfBoundary: [number, number] = convertMapCoordinatesToWorldCoordinates(2, 0);
        const camera: BattleCamera = new BattleCamera(-ScreenDimensions.SCREEN_WIDTH * 2, worldLocationOfBoundary[1]);
        camera.setXVelocity(100);
        camera.setMapDimensionBoundaries(2, 5);

        camera.constrainCamera();

        expect(camera.getCoordinates()[0]).toBeGreaterThanOrEqual(worldLocationOfBoundary[0] - ScreenDimensions.SCREEN_WIDTH / 10);
        expect(camera.getVelocity()[0]).toBe(0);
    });

    it('can be constrained so it cannot scroll too far to the right', () => {
        const worldLocationOfBoundary: [number, number] = convertMapCoordinatesToWorldCoordinates(2, 2);
        const camera: BattleCamera = new BattleCamera(ScreenDimensions.SCREEN_WIDTH * 2, worldLocationOfBoundary[1]);
        camera.setXVelocity(100);
        camera.setMapDimensionBoundaries(2, 5);

        camera.constrainCamera();

        expect(camera.getCoordinates()[0]).toBeLessThanOrEqual(worldLocationOfBoundary[0] + ScreenDimensions.SCREEN_WIDTH / 10);
        expect(camera.getVelocity()[0]).toBe(0);
    });

    describe('camera pan', () => {
        it('can pan over to a coordinate', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            const initialCoordinates: number[] = [0, -ScreenDimensions.SCREEN_HEIGHT];
            const destinationCoordinates: number[] = [100, -ScreenDimensions.SCREEN_HEIGHT + 200];
            const timeToPan: number = 1000;

            const camera: BattleCamera = new BattleCamera(...initialCoordinates);

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            });
            camera.moveCamera();
            expect(camera.isPanning()).toBeTruthy();
            expect(camera.getPanningInformation()).toStrictEqual({
                xStartCoordinate: initialCoordinates[0],
                yStartCoordinate: initialCoordinates[1],
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                panStartTime: 0,
                respectConstraints: false,
            });
            expect(camera.getCoordinates()).toStrictEqual(initialCoordinates);

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan / 2);
            camera.moveCamera();
            expect(camera.getCoordinates()[0]).toBeCloseTo((initialCoordinates[0] + destinationCoordinates[0]) / 2);
            expect(camera.getCoordinates()[1]).toBeCloseTo((initialCoordinates[1] + destinationCoordinates[1]) / 2);

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan);
            camera.moveCamera();
            expect(camera.getCoordinates()).toStrictEqual(destinationCoordinates);
            expect(camera.isPanning()).toBeFalsy();
            expect(camera.getPanningInformation()).toBeUndefined();
        });
        it('will instantly pan over if timeToPan is not positive', () => {
            const initialCoordinates: number[] = [0, -ScreenDimensions.SCREEN_HEIGHT];
            const destinationCoordinates: number[] = [100, -ScreenDimensions.SCREEN_HEIGHT + 200];

            const camera: BattleCamera = new BattleCamera(...initialCoordinates);

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan: 0,
                respectConstraints: false,
            });
            camera.moveCamera();
            expect(camera.getCoordinates()).toStrictEqual(destinationCoordinates);
            expect(camera.isPanning()).toBeFalsy();
            expect(camera.getPanningInformation()).toBeUndefined();
        });
        it('will instantly cut over', () => {
            const initialCoordinates: number[] = [0, -ScreenDimensions.SCREEN_HEIGHT];
            const destinationCoordinates: number[] = [100, -ScreenDimensions.SCREEN_HEIGHT + 200];

            const camera: BattleCamera = new BattleCamera(...initialCoordinates);

            camera.cut({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                respectConstraints: false,
            });
            camera.moveCamera();
            expect(camera.getCoordinates()).toStrictEqual(destinationCoordinates);
        });
        it('can pan over to a coordinate, respecting constraints', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            const initialCoordinates: number[] = [0, -ScreenDimensions.SCREEN_HEIGHT];
            const verticalTopLimit: number = 0 - ScreenDimensions.SCREEN_HEIGHT / 10 + ScreenDimensions.SCREEN_HEIGHT / 2
            const destinationCoordinates: number[] = [0, verticalTopLimit - ScreenDimensions.SCREEN_HEIGHT];
            const timeToPan: number = 1000;

            const camera: BattleCamera = new BattleCamera(...initialCoordinates);

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: true,
            });
            expect(camera.getCoordinates()[1]).toBe(initialCoordinates[1]);

            camera.moveCamera();
            expect(camera.getCoordinates()[1]).toBeCloseTo(verticalTopLimit);
            expect(camera.isPanning()).toBeTruthy();

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan / 2);
            camera.moveCamera();
            expect(camera.getCoordinates()[1]).toBeCloseTo(verticalTopLimit);
            expect(camera.isPanning()).toBeTruthy();

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan);
            camera.moveCamera();
            expect(camera.getCoordinates()[1]).toBeCloseTo(verticalTopLimit);
            expect(camera.isPanning()).toBeFalsy();
        });
        it('can pan over to a coordinate, ignoring constraints', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            const initialCoordinates: number[] = [0, -ScreenDimensions.SCREEN_HEIGHT];
            const verticalTopLimit: number = 0 - ScreenDimensions.SCREEN_HEIGHT / 10 + ScreenDimensions.SCREEN_HEIGHT / 2
            const destinationCoordinates: number[] = [0, verticalTopLimit - ScreenDimensions.SCREEN_HEIGHT];
            const timeToPan: number = 1000;

            const camera: BattleCamera = new BattleCamera(...initialCoordinates);

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            });
            expect(camera.getCoordinates()[1]).toBe(initialCoordinates[1]);

            camera.moveCamera();
            expect(camera.getCoordinates()[1]).toBe(initialCoordinates[1]);
            expect(camera.isPanning()).toBeTruthy();

            jest.spyOn(Date, 'now').mockImplementation(() => timeToPan);
            camera.moveCamera();
            expect(camera.getCoordinates()[1]).toBeCloseTo(destinationCoordinates[1]);
            expect(camera.isPanning()).toBeFalsy();
        });
    });
});
