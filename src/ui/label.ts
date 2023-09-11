import {RectArea} from "./rectArea";
import {TextBox, TextBoxArguments} from "./textBox";
import {Rectangle, RectangleArguments} from "./rectangle";
import {GraphicsContext} from "../utils/graphics/graphicsContext";

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

    draw(graphicsContext: GraphicsContext) {
        this.rectangle.draw(graphicsContext);
        this.textBox.draw(graphicsContext);
    }
}
