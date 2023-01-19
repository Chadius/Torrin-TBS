import {HexMap} from "./hexMap";
import {HexGridTile, Integer} from "./hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {HexGridTerrainTypes} from "./hexGridTerrainType";

describe('hexMap', () => {
  describe('mouseClicks on the map', () => {
    it('should select tiles in a hex pattern', function () {
      const gridTiles: HexGridTile[] = [
        new HexGridTile(0 as Integer, 0 as Integer, HexGridTerrainTypes.pit),
        new HexGridTile(0 as Integer, 1 as Integer, HexGridTerrainTypes.pit),
        new HexGridTile(0 as Integer, 2 as Integer, HexGridTerrainTypes.pit),
        new HexGridTile(0 as Integer, -1 as Integer, HexGridTerrainTypes.pit),
        new HexGridTile(1 as Integer, 0 as Integer, HexGridTerrainTypes.pit),
        new HexGridTile(-1 as Integer, 0 as Integer, HexGridTerrainTypes.pit),
      ];

      const hexGrid = new HexMap({tiles: gridTiles});

      hexGrid.mouseClicked(-100, -100);
      expect(hexGrid.outlineTileCoordinates).toBe(undefined);

      hexGrid.mouseClicked(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 0});

      hexGrid.mouseClicked(SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, SCREEN_HEIGHT / 2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 1});

      hexGrid.mouseClicked(SCREEN_WIDTH / 2 + (2 * HEX_TILE_WIDTH), SCREEN_HEIGHT / 2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 2});

      hexGrid.mouseClicked(SCREEN_WIDTH / 2 - HEX_TILE_WIDTH, SCREEN_HEIGHT / 2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: -1});

      hexGrid.mouseClicked(SCREEN_WIDTH / 2 + (HEX_TILE_WIDTH / 2), SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH / 2));
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 1, r: 0});

      hexGrid.mouseClicked(SCREEN_WIDTH / 2 - (HEX_TILE_WIDTH / 2), SCREEN_HEIGHT / 2 - (HEX_TILE_WIDTH / 2));
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q: -1, r: -0});
    });
  });
  it('can note which tiles are at which locations', () => {
    const gridTiles: HexGridTile[] = [
      new HexGridTile(0 as Integer, 0 as Integer, HexGridTerrainTypes.pit),
      new HexGridTile(0 as Integer, 1 as Integer, HexGridTerrainTypes.doubleMovement),
      new HexGridTile(0 as Integer, 2 as Integer, HexGridTerrainTypes.wall),
      new HexGridTile(0 as Integer, -1 as Integer, HexGridTerrainTypes.singleMovement),
      new HexGridTile(1 as Integer, 0 as Integer, HexGridTerrainTypes.doubleMovement),
      new HexGridTile(-1 as Integer, 0 as Integer, HexGridTerrainTypes.pit),
    ];

    const hexGrid = new HexMap({tiles: gridTiles});
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 0 as Integer})).toBe(HexGridTerrainTypes.pit);
    expect(hexGrid.getTileTerrainTypeAtLocation({
      q: 0 as Integer,
      r: 1 as Integer
    })).toBe(HexGridTerrainTypes.doubleMovement);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 2 as Integer})).toBe(HexGridTerrainTypes.wall);
    expect(hexGrid.getTileTerrainTypeAtLocation({
      q: 0 as Integer,
      r: -1 as Integer
    })).toBe(HexGridTerrainTypes.singleMovement);
    expect(hexGrid.getTileTerrainTypeAtLocation({
      q: 1 as Integer,
      r: 0 as Integer
    })).toBe(HexGridTerrainTypes.doubleMovement);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: -1 as Integer, r: 0 as Integer})).toBe(HexGridTerrainTypes.pit);

    expect(hexGrid.getTileTerrainTypeAtLocation({q: 3 as Integer, r: 3 as Integer})).toBeUndefined();

    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 0 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 1 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 2 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: -1 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 1 as Integer, r: 0 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: -1 as Integer, r: 0 as Integer})).toBeTruthy();

    expect(hexGrid.areCoordinatesOnMap({q: 3 as Integer, r: 3 as Integer})).toBeFalsy();
  });
  describe('can create maps using text strings', () => {
    const verifyTileAtLocationIsExpectedMovementCost = (map: HexMap, q: number, r: number, expectedMovementCost: HexGridTerrainTypes): void => {
      const actualMovementCost = map.getTileTerrainTypeAtLocation({q: q as Integer, r: r as Integer});
      try {
        expect(actualMovementCost).toBe(expectedMovementCost);
      } catch (e) {
        throw new Error(`Expected to find tile of type ${expectedMovementCost} at (${q}, ${r}), found ${actualMovementCost}`);
      }
    }

    it('a single row', () => {
      const mapFromSingleLine = new HexMap({
        movementCost: [
          "1 2 - x 1122--xxOO"
        ]
      });

      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 0, HexGridTerrainTypes.singleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 1, HexGridTerrainTypes.doubleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 2, HexGridTerrainTypes.pit);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 3, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 4, HexGridTerrainTypes.singleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 5, HexGridTerrainTypes.doubleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 6, HexGridTerrainTypes.pit);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 7, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 8, HexGridTerrainTypes.pit);
    });

    it('multiple rows use offsets to place the 0 tile', () => {
      const mapFromMultipleLines = new HexMap({
        movementCost: [
          "1 1 1 ",
          " 2 2 2 ",
          "  _ _ _ ",
          "   x x x ",
        ]
      });

      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 0, HexGridTerrainTypes.singleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 1, HexGridTerrainTypes.singleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 2, HexGridTerrainTypes.singleMovement);

      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 0, HexGridTerrainTypes.doubleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 1, HexGridTerrainTypes.doubleMovement);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 2, HexGridTerrainTypes.doubleMovement);

      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, -1, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 0, HexGridTerrainTypes.pit);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 1, HexGridTerrainTypes.pit);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 2, HexGridTerrainTypes.pit);

      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, -1, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 0, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 1, HexGridTerrainTypes.wall);
      verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 2, HexGridTerrainTypes.wall);
    });
  });
});
