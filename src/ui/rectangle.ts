import {RectArea} from "./rectArea";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {isValidValue} from "../utils/validityCheck";

type RequiredOptions = {
    area: RectArea;
}

type Options = {
    fillColor?: number[];
    strokeColor?: number[];
    strokeWeight?: number;
    noStroke?: boolean;
    noFill?: boolean;
}

export type RectangleArguments = RequiredOptions & Partial<Options>;

export interface Rectangle {
    area: RectArea;
    fillColor?: number[];
    strokeColor?: number[];
    strokeWeight?: number;
    noStroke?: boolean;
    noFill?: boolean;
}

export const RectangleHelper = {
    new: ({
              area,
              fillColor,
              strokeColor,
              strokeWeight,
              noStroke,
              noFill,
          }:
              {
                  area: RectArea;
                  fillColor?: number[];
                  strokeColor?: number[];
                  strokeWeight?: number;
                  noStroke?: boolean;
                  noFill?: boolean;
              } | RectangleArguments): Rectangle => {
        return {
            area: area,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWeight: strokeWeight,
            noStroke: noStroke,
            noFill: noFill,
        }
    },
    draw: (rectangle: Rectangle, graphicsContext: GraphicsContext): void => {
        graphicsContext.push();
        if (isValidValue(rectangle.fillColor)) {
            graphicsContext.fill({hsb: rectangle.fillColor});
        }
        if (isValidValue(rectangle.strokeColor)) {
            graphicsContext.stroke({hsb: rectangle.strokeColor});
        }
        if (isValidValue(rectangle.strokeWeight)) {
            graphicsContext.strokeWeight(rectangle.strokeWeight);
        }
        if (rectangle.noFill) {
            graphicsContext.noFill();
        }
        if (rectangle.noStroke) {
            graphicsContext.noStroke();
        }
        graphicsContext.rect(
            rectangle.area.left,
            rectangle.area.top,
            rectangle.area.width,
            rectangle.area.height,
        );
        graphicsContext.pop();
    }
}
