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

  mouseClicked(mouseX: number, mouseY: number) {
    console.log(`mouse: ${mouseX}, ${mouseY}`);

    // TODO magic numbers
    const worldX = mouseX - 1280 / 2;
    const worldY = mouseY - 720 / 2;
    console.log(`world: ${worldX}, ${worldY}`);

    const tileCoordinates = this.convertWorldCoordinatesToMapCoordinates(worldX, worldY);
    console.log(`tile : ${tileCoordinates[0]}, ${tileCoordinates[1]}`);
  }

  convertWorldCoordinatesToMapCoordinates(worldX: number, worldY: number): [number, number] {
    // TODO 30 is a magic number radius
    const halfSide = 30 * Math.sqrt(3);

    const xScaled = worldX / (halfSide);
    const yScaled = worldY / (halfSide);

    // q = 2 * yScaled / sqrt(3)
    const q = yScaled * 1.154;

    // r = x - (y / sqrt(3))
    const r = xScaled - (yScaled / 1.732);

    return [Math.round(q), Math.round(r)];
  }
}
