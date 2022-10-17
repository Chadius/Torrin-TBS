import * as p5 from 'p5';

export type PositiveNumber = number & {_brand: 'PositiveNumber'}
function assertsPositiveNumber(value: number): asserts value is PositiveNumber {
  if(value < 0) throw new Error('Value must be a positive number');
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;

  constructor(w: PositiveNumber, h: PositiveNumber) {
    assertsPositiveNumber(w);
    assertsPositiveNumber(h);
    this.width = w;
    this.height = h;
  }

  draw(p: p5)  {
    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(33, 50, 11);

    p.push();
    p.stroke(117, 10, 10);
    p.strokeWeight(4);
    p.fill(117, 50, 33);
    p.rect(100, 60, 60, 60);
    p.pop();
  }
}
