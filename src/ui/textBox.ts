import {RectArea} from "./rectArea";
import * as p5 from "p5";
import {HORIZ_ALIGN_LEFT, VERT_ALIGN_BASELINE} from "./constants";

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

export type TextBoxArguments = RequiredOptions & Partial<Options>;

export class TextBox {
    text: string;
    textSize: number;
    fontColor: number[];
    area: RectArea;
    horizAlign: p5.HORIZ_ALIGN;
    vertAlign: p5.VERT_ALIGN;

    constructor(options: TextBoxArguments) {
        this.text = options.text;
        this.textSize = options.textSize;
        this.fontColor = options.fontColor;
        this.area = options.area;

        this.horizAlign = options.horizAlign || HORIZ_ALIGN_LEFT;
        this.vertAlign = options.vertAlign || VERT_ALIGN_BASELINE;
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
