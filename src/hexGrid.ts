import * as p5 from "p5";

export type Integer = number & {_brand: 'Integer'}
function assertsInteger(value: number): asserts value is Integer {
  if(Number.isInteger(value) !== true) throw new Error('Value must be an integer');
}


export class HexGridTile {
  r: number;
  q: number;
  appearance: string;

  constructor(rcoord: number, qcoord: number, appearance: string) {
    assertsInteger(rcoord);
    assertsInteger(qcoord);

    this.r = rcoord;
    this.q = qcoord;
    this.appearance = appearance;
  }

  draw(p: p5)  {
    p.push();
    p.stroke(117, 10, 10);
    p.strokeWeight(1);
    p.fill(117, 50, 33);

    // See Axial Coordinates in:
    // https://www.redblobgames.com/grids/hexagons/
    // r applies the vector (1, 0)
    // q applies the vector (1/2, sqrt(3)/2)
    let xPos = this.r + this.q*0.5
    let yPos = this.q * 0.866

    const radius = 30;
    const halfSide = radius * Math.sqrt(3);

    xPos *= halfSide;
    yPos *= halfSide;

    xPos += 1024 / 2;
    yPos += 576 / 2;

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
