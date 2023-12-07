import {RectAreaHelper} from "./rectArea";
import {TextBox, TextBoxArguments, TextBoxHelper} from "./textBox";
import {Rectangle, RectangleArguments, RectangleHelper} from "./rectangle";
import {GraphicsContext} from "../utils/graphics/graphicsContext";

export type Padding = {
    padding: number | [number, number] | [number, number, number] | [number, number, number, number];
}

export interface Label {
    rectangle: Rectangle;
    textBox: TextBox;
}

export const LabelHelper = {
    new: (options: RectangleArguments & TextBoxArguments & Padding): Label => {
        let rectangle = RectangleHelper.new(options);

        const textBoxWithPadding = RectAreaHelper.new({
            baseRectangle: options.area,
            margin: options.padding
        });

        let textBox = TextBoxHelper.new({
            ...options,
            ...{
                area: textBoxWithPadding,
            }
        });

        return {
            textBox,
            rectangle,
        };
    },
    draw: (label: Label, graphicsContext: GraphicsContext): void => {
        RectangleHelper.draw(label.rectangle, graphicsContext);
        TextBoxHelper.draw(label.textBox, graphicsContext);
    }
}
