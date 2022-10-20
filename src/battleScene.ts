import * as p5 from 'p5';
import {HexGridTerrainTypes, HexGridTile} from "./hexGrid";
import {HexMap} from "./hexMap";

export type PositiveNumber = number & {_brand: 'PositiveNumber'}
function assertsPositiveNumber(value: number): asserts value is PositiveNumber {
  if(value < 0) throw new Error('Value must be a positive number');
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;
  hexMap: HexMap;

  constructor(w: number, h: number) {
    assertsPositiveNumber(w);
    assertsPositiveNumber(h);
    this.width = w;
    this.height = h;

    this.hexMap = new HexMap(
      [
        new HexGridTile(0, 1, HexGridTerrainTypes.water),
        new HexGridTile(1, 1, HexGridTerrainTypes.sand),
        new HexGridTile(0, 0, HexGridTerrainTypes.floor),
        new HexGridTile(2, 1, HexGridTerrainTypes.stone),
        new HexGridTile(-3, 0, HexGridTerrainTypes.grass),
        new HexGridTile(2, 2, HexGridTerrainTypes.stone),
        new HexGridTile(-1, -1, HexGridTerrainTypes.water),
      ]
    )
  }

  draw(p: p5)  {
    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(50, 10, 20);

    this.hexMap.draw(p);
  }
}
