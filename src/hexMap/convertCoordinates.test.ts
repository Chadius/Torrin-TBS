import {convertMapCoordinatesToWorldCoordinates, convertWorldCoordinatesToMapCoordinates} from "./convertCoordinates";
import {HEX_TILE_WIDTH} from "../graphicsConstants";

describe('convertCoordinates', () => {
  it('converts world coordinates to map coordinates', () => {
    expect(convertWorldCoordinatesToMapCoordinates(0, 0)).toStrictEqual([0,0]);
    expect(convertWorldCoordinatesToMapCoordinates(
      HEX_TILE_WIDTH,
      0)
    ).toStrictEqual([0,1]);
    expect(convertWorldCoordinatesToMapCoordinates(
      HEX_TILE_WIDTH / 2 + 1,
      HEX_TILE_WIDTH * Math.sqrt(3) / 2 + 1)
    ).toStrictEqual([1, 0]);
    expect(convertWorldCoordinatesToMapCoordinates(
      HEX_TILE_WIDTH * -1,
      HEX_TILE_WIDTH * -1 * Math.sqrt(3) + 1)
    ).toStrictEqual([-2,-0]);
  });

  it('converts map coordinates to world coordinates', () => {
    expect(convertMapCoordinatesToWorldCoordinates(0, 0)).toStrictEqual([0,0]);
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
});
