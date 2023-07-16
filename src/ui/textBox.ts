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
    duration: number;
}

export type TextBoxArguments = RequiredOptions & Partial<Options>;

export class TextBox {
    private _text: string;
    textSize: number;
    fontColor: number[];
    area: RectArea;
    horizAlign: p5.HORIZ_ALIGN;
    vertAlign: p5.VERT_ALIGN;
    duration: number;
    lastTimeDrawn: number;

    constructor(options: {
        text: string;
        textSize: number;
        fontColor: number[];
        area: RectArea;
        horizAlign?: p5.HORIZ_ALIGN;
        vertAlign?: p5.VERT_ALIGN;
        duration?: number;
    } | TextBoxArguments) {
        ({
            duration: this.duration,
            text: this._text,
            textSize: this.textSize,
            fontColor: this.fontColor,
            area: this.area,
        } = options);

        this.horizAlign = options.horizAlign || HORIZ_ALIGN_LEFT;
        this.vertAlign = options.vertAlign || VERT_ALIGN_BASELINE;

        this.lastTimeDrawn = Date.now();
    }

    draw(p: p5) {
        if (this.isDone()) {
            return;
        }
        p.push();
        p.textSize(this.textSize);
        p.fill(this.fontColor);
        p.textAlign(
            this.horizAlign,
            this.vertAlign
        );
        p.text(
            this._text,
            this.area.left,
            this.area.top,
            this.area.width,
            this.area.height,
        );
        p.textAlign(p.LEFT, p.BASELINE);
        p.pop();
    }

    isDone(): boolean {
        return (
            Date.now() - this.lastTimeDrawn >= this.duration
        );
    }

    stop() {
        this.duration = 0;
    }

    get text(): string {
        return this._text;
    }
}
