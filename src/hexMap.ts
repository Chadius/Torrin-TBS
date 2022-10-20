import * as p5 from "p5";
import {HexGridTile} from "./hexGrid";

export class HexMap {
  tiles: HexGridTile[];

  constructor(tiles: HexGridTile[]) {
    const tileCoords = tiles.map((tile, index) => {
      return {
        i: index,
        value: tile.q * 100 + tile.r
      }}
    );

    tileCoords.sort((a, b) => {
      if (a.value < b.value) {
        return -1;
      }
      if (a.value > b.value) {
        return 1;
      }
      return 0;
    })

    this.tiles = tileCoords.map((v) => tiles[v.i])
  }

  draw(p: p5)  {
    this.tiles.forEach((tile) => {tile.draw(p)});
  }
}
