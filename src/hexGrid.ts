import * as p5 from "p5";

export type Integer = number & {_brand: 'Integer'}
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

  draw(p: p5)  {
    p.push();

    const fillColor = this.colorByAppearance[this.appearance];
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

    // radius is the length from the center of the hexagon to one of the corners.
    const radius = 30; // TODO extract const

    // halfside is the length of the square that contains the hexagon.
    const halfSide = radius * Math.sqrt(3);

    xPos *= halfSide;
    yPos *= halfSide;

    // TODO Magic numbers
    xPos += 1280 / 2;
    yPos += 720 / 2;

    p.push();
    p.translate(xPos, yPos);

    let angle = Math.PI / 3;
    p.beginShape();
    const startAngle = Math.PI / 6;
    for (let a = 0; a < 6; a += 1) {
      let sx = Math.cos(startAngle + a * angle) * 30;
      let sy = Math.sin(startAngle + a * angle) * 30;
      p.vertex(sx, sy);
    }
    p.endShape("close");

    p.pop();
    p.pop();
  }
}
