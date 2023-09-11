import {GraphicImage, GraphicsContext} from "./graphicsContext";
import p5 from "p5";

export class P5GraphicsContext implements GraphicsContext {
    p: p5;

    constructor({p}: { p: p5 }) {
        this.p = p;
    }

    background(hue: number, saturation: number, brightness: number): void {
        this.p.background(hue, saturation, brightness);
    }

    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void {
        this.p.colorMode(modeKey, hueMaximumValue, saturationMaximumValue, brightnessMaximumValue, alphaMaximumValue);
    }

    createImage(height: number, width: number): GraphicImage {
        return this.p.createImage(width, height);
    }

    fill({hsb, color}: { hsb?: number[]; color?: string }): void {
        if (hsb) {
            this.p.fill(hsb[0], hsb[1], hsb[2]);
            return;
        }

        if (color) {
            this.p.fill(color);
            return;
        }
    }

    image(data: GraphicImage, left: number, top: number, width?: number, height?: number): void {
        const img = data as p5.Image;
        if (width !== undefined && height !== undefined) {
            this.p.image(img, left, top, width, height);
            return;
        }
        this.p.image(img, left, top);
    }

    line(x1: number, y1: number, x2: number, y2: number): void {
        this.p.line(x1, y1, x2, y2);
    }

    loadImage(pathToImage: string, successCallback: (loadedImage: GraphicImage) => void, failureCallback: (failEvent: Event) => void): void {
        this.p.loadImage(
            pathToImage,
            successCallback,
            failureCallback,
        )
    }

    noStroke(): void {
        this.p.noStroke();
    }

    noTint(): void {
        this.p.noTint();
    }

    pop(): void {
        this.p.pop();
    }

    push(): void {
        this.p.push();
    }

    rect(left: number, top: number, width: number, height: number): void {
        this.p.rect(left, top, width, height);
    }

    stroke({hsb, color}: { hsb?: number[]; color?: string }): void {
        if (hsb) {
            this.p.stroke(hsb[0], hsb[1], hsb[2]);
            return;
        }

        if (color) {
            this.p.stroke(color);
            return;
        }
    }

    strokeWeight(weight: number): void {
        this.p.strokeWeight(weight);
    }

    text(text: string, x1: number, y1: number, x2: number, y2: number): void {
        this.p.text(text, x1, y1, x2, y2);
    }

    textAlign(horizontalAlignment: string, verticalAlignment: string): void {
        const horizAlign = horizontalAlignment as p5.HORIZ_ALIGN;
        const vertAlign = verticalAlignment as p5.VERT_ALIGN;
        this.p.textAlign(horizAlign, vertAlign);
    }

    textSize(size: number): void {
        this.p.textSize(size);
    }

    tint(hue: number, saturation: number, brightness: number, alpha: number): void {
        this.p.tint(hue, saturation, brightness, alpha);
    }

    beginShape(): void {
        this.p.beginShape();
    }

    endShape(mode: string): void {
        this.p.endShape(mode as p5.END_MODE);
    }

    translate(x: number, y: number): void {
        this.p.translate(x, y);
    }

    vertex(x: number, y: number): void {
        this.p.vertex(x, y);
    }

    noFill(): void {
        this.p.noFill();
    }
}
