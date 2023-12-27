export type ColorDescription = {
    hsb?: number[],
    color?: string
};

export interface GraphicsContext {
    background(hue: number, saturation: number, brightness: number): void;

    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void;

    createImage(height: number, width: number): GraphicImage;

    fill({hsb, color}: ColorDescription): void;

    image(data: GraphicImage, left: number, top: number, width?: number, height?: number): void;

    line(x1: number, y1: number, x2: number, y2: number): void;

    loadImage(pathToImage: string, successCallback: () => {}, failureCallback: () => {}): void;

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

    windowWidth(): number;

    windowHeight(): number;
}

export interface GraphicImage {
    loadPixels(): void;

    get width(): number;

    get height(): number;
}

