import * as p5 from 'p5';
import {HexGridTile} from "./hexGrid";

export type PositiveNumber = number & {_brand: 'PositiveNumber'}
function assertsPositiveNumber(value: number): asserts value is PositiveNumber {
  if(value < 0) throw new Error('Value must be a positive number');
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;
  gridTiles: HexGridTile[];

  constructor(w: number, h: number) {
    assertsPositiveNumber(w);
    assertsPositiveNumber(h);
    this.width = w;
    this.height = h;

    this.gridTiles = [
      new HexGridTile(0, 1, "grass"),
      new HexGridTile(1, 1, "grass"),
      new HexGridTile(0, 0, "grass"),
      new HexGridTile(2, 1, "grass"),
      new HexGridTile(-3, 0, "grass"),
      new HexGridTile(2, 2, "grass"),
    ];
  }

  draw(p: p5)  {
    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(33, 50, 11);

    this.gridTiles.forEach((tile) => {tile.draw(p)});

  }
}
