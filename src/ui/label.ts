import {RectArea, RectArguments} from "./rectArea";
import {TextBox, TextBoxArguments} from "./textBox";
import {Rectangle, RectangleArguments} from "./rectangle";
import p5 from "p5";

export type Padding = {
  padding: number | [number, number] | [number, number, number] | [number, number, number, number];
}

export class Label {
  rectangle: Rectangle;
  textBox: TextBox;

  constructor(options: RectangleArguments & TextBoxArguments & Padding) {
    this.rectangle = new Rectangle(options);

    const textBoxWithPadding = new RectArea({
      baseRectangle: options.area,
      margin: options.padding
    });

    this.textBox = new TextBox({
      ...options,
      ...{
        area: textBoxWithPadding,
      }
    });
  }

  draw(p: p5) {
    this.rectangle.draw(p);
    this.textBox.draw(p);
  }
}
