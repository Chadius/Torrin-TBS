import {RectArea} from "./rectArea";
import * as p5 from "p5";
import {HORIZONTAL_ALIGN, VERTICAL_ALIGN} from "./constants";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {isValidValue} from "../utils/validityCheck";

export type TextBoxArguments = {
    text: string;
    textSize: number;
    fontColor: number[];
    area: RectArea;
    horizAlign?: p5.HORIZ_ALIGN;
    vertAlign?: p5.VERT_ALIGN;
    duration?: number;
    lastTimeDrawn?: number;
};

export interface TextBox {
    textSize: number;
    fontColor: number[];
    area: RectArea;
    horizAlign: p5.HORIZ_ALIGN;
    vertAlign: p5.VERT_ALIGN;
    duration: number;
    lastTimeDrawn: number;
    text: string;
}

export const TextBoxService = {
    new: ({
              textSize,
              fontColor,
              area,
              horizAlign,
              vertAlign,
              duration,
              lastTimeDrawn,
              text,
          }: TextBoxArguments): TextBox => {
        return {
            textSize: textSize,
            fontColor: fontColor,
            area: area,
            horizAlign: horizAlign || HORIZONTAL_ALIGN.LEFT,
            vertAlign: vertAlign || VERTICAL_ALIGN.BASELINE,
            duration: duration,
            lastTimeDrawn: lastTimeDrawn || Date.now(),
            text: text,
        }
    },
    draw: (textBox: TextBox, graphicsContext: GraphicsContext): void => {
        if (isDone(textBox)) {
            return;
        }

        graphicsContext.push();
        graphicsContext.textSize(textBox.textSize);
        graphicsContext.fill({hsb: textBox.fontColor});
        graphicsContext.textAlign(
            textBox.horizAlign,
            textBox.vertAlign
        );
        graphicsContext.text(
            textBox.text,
            textBox.area.left,
            textBox.area.top,
            textBox.area.width,
            textBox.area.height,
        );
        graphicsContext.textAlign(HORIZONTAL_ALIGN.LEFT, VERTICAL_ALIGN.BASELINE);
        graphicsContext.pop();
    },
    isDone: (textBox: TextBox): boolean => {
        return isDone(textBox);
    },
    stop: (textBox: TextBox) => {
        textBox.duration = 0;
    }
}

const isDone = (textBox: TextBox): boolean => {
    return (
        !isValidValue(textBox)
        || Date.now() - textBox.lastTimeDrawn >= textBox.duration
    );
}
