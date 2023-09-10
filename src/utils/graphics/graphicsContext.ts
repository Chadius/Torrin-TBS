export interface GraphicsContext {
    background(hue: number, saturation: number, brightness: number): void;

    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void;

    createImage(height: number, width: number): GraphicImage;

    fill(params: {hsb?:number[], color?: string}): void;

    image(data: GraphicImage, left: number, top: number, width: number, height: number): void;

    line(x1: number, y1: number, x2: number, y2: number): void;

    loadImage(pathToImage: string, successCallback: () => {}, failureCallback: () => {}): void;

    noStroke(): void;

    noTint(): void;

    pop(): void;

    push(): void;

    rect(left: number, top: number, width: number, height: number): void;

    stroke(params: {hsb?:number[], color?: string}): void;

    strokeWeight(weight: number): void;

    text(text: string, left: number, top: number, width: number, height: number): void;

    textAlign(horizontalAlignment: string, verticalAlignment: string): void;

    textSize(size: number): void;

    tint(hue: number, saturation: number, brightness: number, alpha: number): void;
}

export interface GraphicImage {
    loadPixels(): void;
    get width(): number;
    get height(): number;
}
