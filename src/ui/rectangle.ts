import {RectArea} from "./rectArea";
import p5 from "p5";

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
        if (this.noStroke) {
            p.noStroke();
        }
        p.rect(
            this.area.left,
            this.area.top,
            this.area.width,
            this.area.height,
        );
        p.pop();
    }
}
