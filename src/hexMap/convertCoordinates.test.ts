import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates,
    convertScreenCoordinatesToMapCoordinates,
    convertScreenCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates,
    convertWorldCoordinatesToScreenCoordinates
} from "./convertCoordinates";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";

describe('convertCoordinates', () => {
    it('converts world coordinates to map coordinates', () => {
        expect(convertWorldCoordinatesToMapCoordinates(0, 0)).toStrictEqual([0, 0]);
        expect(convertWorldCoordinatesToMapCoordinates(
            HEX_TILE_WIDTH,
            0)
        ).toStrictEqual([0, 1]);
        expect(convertWorldCoordinatesToMapCoordinates(
            HEX_TILE_WIDTH / 2 + 1,
            HEX_TILE_WIDTH * Math.sqrt(3) / 2 + 1)
        ).toStrictEqual([1, 0]);
        expect(convertWorldCoordinatesToMapCoordinates(
            HEX_TILE_WIDTH * -1,
            HEX_TILE_WIDTH * -1 * Math.sqrt(3) + 1)
        ).toStrictEqual([-2, -0]);
    });

    it('converts map coordinates to world coordinates', () => {
        expect(convertMapCoordinatesToWorldCoordinates(0, 0)).toStrictEqual([0, 0]);
        expect(convertMapCoordinatesToWorldCoordinates(0, 1)).toStrictEqual(
            [
                HEX_TILE_WIDTH,
                0
            ]);
        expect(convertMapCoordinatesToWorldCoordinates(1, 0)).toStrictEqual(
            [
                HEX_TILE_WIDTH / 2,
                HEX_TILE_WIDTH * Math.sqrt(3) / 2
            ]
        );
        expect(convertMapCoordinatesToWorldCoordinates(-2, 0)).toStrictEqual(
            [
                HEX_TILE_WIDTH * -1,
                HEX_TILE_WIDTH * -1 * Math.sqrt(3)
            ]
        );
    });

    it('converts world coordinates to screen coordinates', () => {
        expect(convertWorldCoordinatesToScreenCoordinates(0, 0, 0, 0))
            .toStrictEqual([0 + SCREEN_WIDTH / 2, 0 + SCREEN_HEIGHT / 2]);

        expect(convertWorldCoordinatesToScreenCoordinates(1, 0, 0, 0))
            .toStrictEqual([1 + SCREEN_WIDTH / 2, 0 + SCREEN_HEIGHT / 2]);
        expect(convertWorldCoordinatesToScreenCoordinates(0, 1, 0, 0))
            .toStrictEqual([0 + SCREEN_WIDTH / 2, 1 + SCREEN_HEIGHT / 2]);

        expect(convertWorldCoordinatesToScreenCoordinates(0, 0, 0, 1))
            .toStrictEqual([0 + SCREEN_WIDTH / 2, -1 + SCREEN_HEIGHT / 2]);
        expect(convertWorldCoordinatesToScreenCoordinates(0, 1, 0, 0))
            .toStrictEqual([0 + SCREEN_WIDTH / 2, 1 + SCREEN_HEIGHT / 2]);
    });

    it('converts screen coordinates to world coordinates', () => {
        expect(convertScreenCoordinatesToWorldCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 0, 0))
            .toStrictEqual([0, 0]);

        expect(convertScreenCoordinatesToWorldCoordinates(SCREEN_WIDTH / 2 + 1, SCREEN_HEIGHT / 2, 0, 0))
            .toStrictEqual([1, 0]);
        expect(convertScreenCoordinatesToWorldCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1, 0))
            .toStrictEqual([1, 0]);

        expect(convertScreenCoordinatesToWorldCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 1, 0, 0))
            .toStrictEqual([0, 1]);
        expect(convertScreenCoordinatesToWorldCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 0, 1))
            .toStrictEqual([0, 1]);
    });

    it('converts map coordinates to screen coordinates', () => {
        expect(convertMapCoordinatesToScreenCoordinates(0, 0, 0, 0))
            .toStrictEqual([SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2]);

        expect(convertMapCoordinatesToScreenCoordinates(0, 1, 0, 0))
            .toStrictEqual([SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, SCREEN_HEIGHT / 2]);

        expect(convertMapCoordinatesToScreenCoordinates(1, 0, 0, 0))
            .toStrictEqual([
                SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
                SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH * Math.sqrt(3) / 2)
            ]);

        expect(convertMapCoordinatesToScreenCoordinates(0, 0, 1, 0))
            .toStrictEqual([SCREEN_WIDTH / 2 - 1, SCREEN_HEIGHT / 2]);
        expect(convertMapCoordinatesToScreenCoordinates(0, 0, 0, 1))
            .toStrictEqual([SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 1]);
    });

    it('converts screen coordinates to map coordinates', () => {
        expect(convertScreenCoordinatesToMapCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 0, 0))
            .toStrictEqual([0, 0]);

        expect(convertScreenCoordinatesToMapCoordinates(SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, SCREEN_HEIGHT / 2, 0, 0))
            .toStrictEqual([0, 1]);
        expect(convertScreenCoordinatesToMapCoordinates(SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2, SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH * Math.sqrt(3) / 2), 0, 0))
            .toStrictEqual([1, -0]);

        expect(convertScreenCoordinatesToMapCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, HEX_TILE_WIDTH * -1, 0))
            .toStrictEqual([0, -1]);
        expect(convertScreenCoordinatesToMapCoordinates(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, HEX_TILE_WIDTH / 2, (HEX_TILE_WIDTH * Math.sqrt(3) / 2)))
            .toStrictEqual([1, -0]);
    });
});
