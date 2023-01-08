import {HexMap} from "./hexMap";
import {HexGridTile, Integer} from "./hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {HexGridTerrainTypes} from "./hexGridTerrainType";

describe('hexMap', () => {
  describe('mouseClicks on the map',  () => {
    it('should select tiles in a hex pattern', function () {
      const gridTiles: HexGridTile[] = [
        new HexGridTile(0, 0, HexGridTerrainTypes.water),
        new HexGridTile(0, 1, HexGridTerrainTypes.water),
        new HexGridTile(0, 2, HexGridTerrainTypes.water),
        new HexGridTile(0, -1, HexGridTerrainTypes.water),
        new HexGridTile(1, 0, HexGridTerrainTypes.water),
        new HexGridTile(-1, 0, HexGridTerrainTypes.water),
      ];

      const hexGrid = new HexMap(gridTiles);

      hexGrid.mouseClicked(-100,-100);
      expect(hexGrid.outlineTileCoordinates).toBe(undefined);

      hexGrid.mouseClicked(SCREEN_WIDTH/2,SCREEN_HEIGHT/2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:0, r:0});

      hexGrid.mouseClicked(SCREEN_WIDTH/2 + HEX_TILE_WIDTH,SCREEN_HEIGHT/2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:0, r:1});

      hexGrid.mouseClicked(SCREEN_WIDTH/2 + (2 * HEX_TILE_WIDTH),SCREEN_HEIGHT/2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:0, r:2});

      hexGrid.mouseClicked(SCREEN_WIDTH/2 - HEX_TILE_WIDTH,SCREEN_HEIGHT/2);
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:0, r:-1});

      hexGrid.mouseClicked(SCREEN_WIDTH/2 + (HEX_TILE_WIDTH / 2),SCREEN_HEIGHT/2 + (HEX_TILE_WIDTH / 2));
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:1, r:0});

      hexGrid.mouseClicked(SCREEN_WIDTH/2 - (HEX_TILE_WIDTH / 2),SCREEN_HEIGHT/2 - (HEX_TILE_WIDTH / 2));
      expect(hexGrid.outlineTileCoordinates).toMatchObject({q:-1, r:-0});
    });
  });
  it('can note which tiles are at which locations', () => {
    const gridTiles: HexGridTile[] = [
      new HexGridTile(0, 0, HexGridTerrainTypes.water),
      new HexGridTile(0, 1, HexGridTerrainTypes.sand),
      new HexGridTile(0, 2, HexGridTerrainTypes.floor),
      new HexGridTile(0, -1, HexGridTerrainTypes.grass),
      new HexGridTile(1, 0, HexGridTerrainTypes.stone),
      new HexGridTile(-1, 0, HexGridTerrainTypes.water),
    ];

    const hexGrid = new HexMap(gridTiles);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 0 as Integer})).toBe(HexGridTerrainTypes.water);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 1 as Integer})).toBe(HexGridTerrainTypes.sand);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 2 as Integer})).toBe(HexGridTerrainTypes.floor);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: -1 as Integer})).toBe(HexGridTerrainTypes.grass);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: 1 as Integer, r: 0 as Integer})).toBe(HexGridTerrainTypes.stone);
    expect(hexGrid.getTileTerrainTypeAtLocation({q: -1 as Integer, r: 0 as Integer})).toBe(HexGridTerrainTypes.water);

    expect(hexGrid.getTileTerrainTypeAtLocation({q: 3 as Integer, r: 3 as Integer})).toBeUndefined();

    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 0 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 1 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 2 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: -1 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: 1 as Integer, r: 0 as Integer})).toBeTruthy();
    expect(hexGrid.areCoordinatesOnMap({q: -1 as Integer, r: 0 as Integer})).toBeTruthy();

    expect(hexGrid.areCoordinatesOnMap({q: 3 as Integer, r: 3 as Integer})).toBeFalsy();
  });
});
