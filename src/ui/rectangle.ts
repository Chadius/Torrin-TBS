import {RectArea} from "./rectArea";

type RequiredOptions = {
  area: RectArea;
}

type Options = {
  fillColor?: number[];
  strokeColor?: number[];
  strokeWeight?: number;
}

export class Rectangle {
  area: RectArea;
  fillColor?: number[];
  strokeColor?: number[];
  strokeWeight?: number;

  constructor(options: RequiredOptions & Partial<Options>) {
    this.area = options.area;
    this.fillColor = options.fillColor;
    this.strokeColor = options.strokeColor;
    this.strokeWeight = options.strokeWeight;
  }

  draw(p: p5) {
    p.push();
    if (this.fillColor) {
      p.fill(this.fillColor);
    }
    if (this.strokeColor) {
      p.stroke(this.strokeColor);
    }
    if (this.strokeWeight) {
      p.strokeWeight(this.strokeWeight);
    }
    p.rect(
      this.area.getLeft(),
      this.area.getTop(),
      this.area.getWidth(),
      this.area.getHeight(),
    );
    p.pop();
  }
}
