import p5, {UNKNOWN_P5_CONSTANT} from "p5";

export type ColorDescription = {
    hsb: number[],
};

export interface GraphicsRenderer extends GraphicsBuffer {
    windowWidth(): number;
    windowHeight(): number;
}

export interface GraphicsBuffer {
    background(hue: number, saturation: number, brightness: number): void
    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void
    createImage(height: number, width: number): p5.Image
    fill(hue: number, saturation: number, brightness: number): void
    image(data: p5.Image, left: number, top: number, width?: number, height?: number): void
    line(x1: number, y1: number, x2: number, y2: number): void
    loadImage(pathToImage: string, successCallback: () => {}, failureCallback: () => {}): void
    noStroke(): void
    noTint(): void
    pop(): void
    push(): void
    rect(left: number, top: number, width: number, height: number): void
    stroke(hue: number, saturation: number, brightness: number): void
    strokeWeight(weight: number): void
    text(text: string, x1: number, y1: number, x2: number, y2: number): void
    textAlign(horizontalAlignment: string, verticalAlignment: string): void
    textSize(size: number): void
    tint(hue: number, saturation: number, brightness: number, alpha: number): void
    translate(x: number, y: number): void
    beginShape(): void
    vertex(x: number, y: number): void
    endShape(mode: string): void
    noFill(): void
}

// export interface GraphicImage {
//     loadPixels(): void
//     get width(): number
//     get height(): number
//     get(): GraphicImage
//     set(x: number, y: number, a: number | number[] | object): void
//     updatePixels(): void
//     resize(width: number, height: number): void
//     reset(): void
//     copy(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void
//     mask(srcImage: GraphicImage): void
//     filter(filterType: p5.FILTER_TYPE, filterParam?: number): void
//     blend(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: UNKNOWN_P5_CONSTANT): void
//     save(filename: string, extension: string): void
//     getCurrentFrame(): number
//     setFrame(index: number): void
//     numFrames(): number
//     play(): void
//     pause(): void
//     delay(     d: number,     index?: number): void
//     pixels: number[]
// }
