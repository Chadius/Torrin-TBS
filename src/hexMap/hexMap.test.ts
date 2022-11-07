import {HexMap} from "./hexMap";
import {HexGridTerrainTypes, HexGridTile} from "./hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";

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
