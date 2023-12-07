import {RectArea} from "./rectArea";
import {GraphicsContext} from "../utils/graphics/graphicsContext";

type RequiredOptions = {
    area: RectArea;
}

type Options = {
    fillColor?: number[];
    strokeColor?: number[];
    strokeWeight?: number;
    noStroke?: boolean;
}

export type RectangleArguments = RequiredOptions & Partial<Options>;

export interface Rectangle {
    area: RectArea;
    fillColor?: number[];
    strokeColor?: number[];
    strokeWeight?: number;
    noStroke?: boolean;
}

export const RectangleHelper = {
    new: ({
              area,
              fillColor,
              strokeColor,
              strokeWeight,
              noStroke,
          }:
              {
                  area: RectArea;
                  fillColor?: number[];
                  strokeColor?: number[];
                  strokeWeight?: number;
                  noStroke?: boolean;
              } | RectangleArguments): Rectangle => {
        return {
            area: area,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWeight: strokeWeight,
            noStroke: noStroke,
        }
    },
    draw: (rectangle: Rectangle, graphicsContext: GraphicsContext): void => {
        graphicsContext.push();
        if (rectangle.fillColor) {
            graphicsContext.fill({hsb: rectangle.fillColor});
        }
        if (rectangle.strokeColor) {
            graphicsContext.stroke({hsb: rectangle.strokeColor});
        }
        if (rectangle.strokeWeight) {
            graphicsContext.strokeWeight(rectangle.strokeWeight);
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
