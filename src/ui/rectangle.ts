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

export class Rectangle {
    area: RectArea;
    fillColor?: number[];
    strokeColor?: number[];
    strokeWeight?: number;
    noStroke?: boolean;

    constructor({
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
                    } | RectangleArguments) {
        this.area = area;
        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
        this.strokeWeight = strokeWeight;
        this.noStroke = noStroke;
    }

    draw(graphicsContext: GraphicsContext) {
        graphicsContext.push();
        if (this.fillColor) {
            graphicsContext.fill({hsb: this.fillColor});
        }
        if (this.strokeColor) {
            graphicsContext.stroke({hsb: this.strokeColor});
        }
        if (this.strokeWeight) {
            graphicsContext.strokeWeight(this.strokeWeight);
        }
        if (this.noStroke) {
            graphicsContext.noStroke();
        }
        graphicsContext.rect(
            this.area.left,
            this.area.top,
            this.area.width,
            this.area.height,
        );
        graphicsContext.pop();
    }
}
