import p5 from "p5";

export type ColorDescription = {
    hsb?: number[],
    color?: string
};

export interface GraphicsContext extends GraphicsCanvas{
    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void;

    createImage(width: number, height: number): GraphicImage;

    loadImage(pathToImage: string, successCallback: () => {}, failureCallback: () => {}): void;

    windowWidth(): number;

    windowHeight(): number;

    createGraphics(width: number, height: number): p5.Graphics;
}

export interface GraphicImage {
    loadPixels(): void;

    get width(): number;

    get height(): number;
}

export interface GraphicsCanvas {
    background(hue: number, saturation: number, brightness: number): void;

    fill({hsb, color}: ColorDescription): void;

    image(data: GraphicImage, left: number, top: number, width?: number, height?: number): void;

    line(x1: number, y1: number, x2: number, y2: number): void;

    noStroke(): void;

    noTint(): void;

    pop(): void;

    push(): void;

    rect(left: number, top: number, width: number, height: number): void;

    stroke({hsb, color}: ColorDescription): void;

    strokeWeight(weight: number): void;

    text(text: string, x1: number, y1: number, x2: number, y2: number): void;

    textAlign(horizontalAlignment: string, verticalAlignment: string): void;

    textSize(size: number): void;

    tint(hue: number, saturation: number, brightness: number, alpha: number): void;

    translate(x: number, y: number): void;

    beginShape(): void;

    vertex(x: number, y: number): void;

    endShape(mode: string): void;

    noFill(): void;
}
