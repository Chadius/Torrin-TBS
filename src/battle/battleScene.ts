import * as p5 from 'p5';
import {HexGridTerrainTypes, HexGridTile, Integer} from "../hexMap/hexGrid";
import {HexMap} from "../hexMap/hexMap";

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

    type Tile = [number, number, HexGridTerrainTypes];
    const rawTiles: Tile[] = [
      [-1, -1, HexGridTerrainTypes.water],
      [ 0, -1, HexGridTerrainTypes.water],
      [ 1, -1, HexGridTerrainTypes.water],
      [ 2, -1, HexGridTerrainTypes.water],
      [ 3, -1, HexGridTerrainTypes.water],

      [-1, 0, HexGridTerrainTypes.floor],
      [ 0, 0, HexGridTerrainTypes.floor],
      [ 1, 0, HexGridTerrainTypes.floor],
      [ 2, 0, HexGridTerrainTypes.floor],

      [-2, 1, HexGridTerrainTypes.grass],
      [-1, 1, HexGridTerrainTypes.grass],
      [ 0, 1, HexGridTerrainTypes.grass],
      [ 1, 1, HexGridTerrainTypes.grass],
      [ 2, 1, HexGridTerrainTypes.grass],

      [-2, 2, HexGridTerrainTypes.sand],
      [-1, 2, HexGridTerrainTypes.sand],
      [ 0, 2, HexGridTerrainTypes.sand],
      [ 1, 2, HexGridTerrainTypes.sand],

      [-3, 3, HexGridTerrainTypes.stone],
      [-2, 3, HexGridTerrainTypes.stone],
      [-1, 3, HexGridTerrainTypes.stone],
      [ 0, 3, HexGridTerrainTypes.stone],
      [ 1, 3, HexGridTerrainTypes.stone],
    ];

    this.hexMap = new HexMap( rawTiles.map(triple => {
      return new HexGridTile(triple[0], triple[1], triple[2])
    }));

    this.hexMap.highlightTiles(
      [
        {
          q: 0 as Integer,
          r: 0 as Integer,
        },
        {
          q: 2 as Integer,
          r: 0 as Integer,
        }
      ],
      {
        hue: 0,
        saturation: 80,
        brightness: 80,
        lowAlpha: 80,
        highAlpha: 90,
        periodAlpha: 2000,
      },
    );
  }

  draw(p: p5)  {
    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(50, 10, 20);

    this.hexMap.draw(p);
  }

  mouseClicked(mouseX: number, mouseY: number) {
    this.hexMap.stopHighlightingTiles();
    this.hexMap.mouseClicked(mouseX, mouseY);
  }
}