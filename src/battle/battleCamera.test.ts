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
});