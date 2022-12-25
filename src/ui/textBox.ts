import {RectArea} from "./rectArea";
import p5 from "p5";

type RequiredOptions = {
  text: string;
  textSize: number;
  fontColor: number[];
  area: RectArea;
}

type Options = {
  horizAlign: p5.HORIZ_ALIGN;
  vertAlign: p5.VERT_ALIGN;
}

export class TextBox {
  text: string;
  textSize: number;
  fontColor: number[];
  area: RectArea;
  horizAlign: p5.HORIZ_ALIGN;
  vertAlign: p5.VERT_ALIGN;


  constructor(options: RequiredOptions & Partial<Options>) {
    this.text = options.text;
    this.textSize = options.textSize;
    this.fontColor = options.fontColor;
    this.area = options.area;

    this.horizAlign = options.horizAlign || "left";
    this.vertAlign = options.vertAlign || "alphabetic";
  }

  draw(p: p5) {
    p.push();
    p.textSize(this.textSize);
    p.fill(this.fontColor);
    p.textAlign(
      this.horizAlign,
      this.vertAlign
    );
    p.text(
      this.text,
      this.area.getLeft(),
      this.area.getTop(),
      this.area.getWidth(),
      this.area.getHeight(),
    );
    p.textAlign(p.LEFT, p.BASELINE);
    p.pop();
  }
}
