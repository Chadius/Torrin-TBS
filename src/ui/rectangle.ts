import {RectArea} from "./rectArea";
import {GraphicsRenderer} from "../utils/graphics/graphicsRenderer";
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
    draw: (rectangle: Rectangle, graphicsContext: GraphicsRenderer): void => {
        graphicsContext.push();
        if (isValidValue(rectangle.fillColor)) {
            graphicsContext.fill(rectangle.fillColor[0],rectangle.fillColor[1],rectangle.fillColor[2],);
        }
        if (isValidValue(rectangle.strokeColor)) {
            graphicsContext.stroke(rectangle.strokeColor[0],rectangle.strokeColor[1],rectangle.strokeColor[2],);
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
