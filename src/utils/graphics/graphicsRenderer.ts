import p5 from "p5"

export type ColorDescription = {
    hsb: number[]
}

export interface GraphicsRenderer extends GraphicsBuffer {
    windowWidth(): number

    windowHeight(): number

    get p(): p5
}

export interface GraphicsBuffer {
    background(hue: number, saturation: number, brightness: number): void

    colorMode(
        modeKey: string,
        hueMaximumValue: number,
        saturationMaximumValue: number,
        brightnessMaximumValue: number,
        alphaMaximumValue: number
    ): void

    createImage(height: number, width: number): p5.Image

    fill(hue: number, saturation: number, brightness: number): void

    image(
        data: p5.Image,
        left: number,
        top: number,
        width?: number,
        height?: number
    ): void

    line(x1: number, y1: number, x2: number, y2: number): void

    loadImage(
        pathToImage: string,
        successCallback: (loadedImage: p5.Image) => void,
        failureCallback: (failEvent: Event) => void
    ): void

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

    tint(
        hue: number,
        saturation: number,
        brightness: number,
        alpha: number
    ): void

    translate(x: number, y: number): void

    beginShape(): void

    vertex(x: number, y: number): void

    endShape(mode: string): void

    noFill(): void

    get width(): number

    get height(): number
}
