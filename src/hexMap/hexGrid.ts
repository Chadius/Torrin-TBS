import * as p5 from "p5";
import {BlendColor, drawHexShape} from "./hexDrawingUtils";

export type Integer = number & {_brand: 'Integer'}
export type HexCoordinate = {q: Integer, r: Integer}
function assertsInteger(value: number): asserts value is Integer {
  if(Number.isInteger(value) !== true) throw new Error('Value must be an integer');
}

export enum HexGridTerrainTypes {
  grass = 1,
  sand,
  stone,
  water,
  floor,
}

type HexGridTerrainToColor = Record<HexGridTerrainTypes, number[]>

export class HexGridTile {
  r: number;
  q: number;
  appearance: HexGridTerrainTypes;
  colorByAppearance: HexGridTerrainToColor

  constructor(rcoord: number, qcoord: number, appearance: HexGridTerrainTypes) {
    assertsInteger(rcoord);
    assertsInteger(qcoord);

    this.r = rcoord;
    this.q = qcoord;
    this.appearance = appearance;

    this.colorByAppearance = {
      [HexGridTerrainTypes.grass]: [117, 50, 33],
      [HexGridTerrainTypes.sand]: [57, 50, 45],
      [HexGridTerrainTypes.stone]: [355, 10, 13],
      [HexGridTerrainTypes.water]: [209, 46, 40],
      [HexGridTerrainTypes.floor]: [41, 15, 40],
    }
  }

  draw(p: p5, blendColor?: BlendColor)  {
    // blendColor is an optional fill/blend color, an array of 4 numbers:
    // - Hue (0-360)
    // - Saturation (0-100)
    // - Brightness (0-100)
    // - Blending factor (0 = no blending, 100 = override original color)

    p.push();

    const appearanceFillColor = this.colorByAppearance[this.appearance];
    let fillColor;

    if (blendColor) {
      const appearanceColorWeight = 100 - blendColor[3];

      fillColor = [
        ((appearanceFillColor[0] * appearanceColorWeight) + (blendColor[0] * blendColor[3])) / 100,
        ((appearanceFillColor[1] * appearanceColorWeight) + (blendColor[1] * blendColor[3])) / 100,
        ((appearanceFillColor[2] * appearanceColorWeight) + (blendColor[2] * blendColor[3])) / 100,
      ]
    } else {
      fillColor = appearanceFillColor;
    }

    const strokeColor = [
      fillColor[0],
      10,
      10
    ];

    p.stroke(strokeColor);
    p.strokeWeight(1);
    p.fill(fillColor)

    // See Axial Coordinates in:
    // https://www.redblobgames.com/grids/hexagons/
    // r applies the vector (1, 0)
    // q applies the vector (1/2, sqrt(3)/2)
    let xPos = this.r + this.q*0.5
    let yPos = this.q * 0.866

    drawHexShape(p, xPos, yPos);
    p.pop();
  }
}
