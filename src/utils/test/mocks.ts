import p5 from "p5"
import { ImageUI } from "../../ui/imageUI"
import { ResourceHandler } from "../../resource/resourceHandler"
import { StubImmediateLoader } from "../../resource/resourceHandlerTestUtils"
import { RectAreaService } from "../../ui/rectArea"
import { makeResult } from "../ResultOrError"
import { GraphicsBuffer, GraphicsRenderer } from "../graphics/graphicsRenderer"

jest.mock("p5", () => () => {
    return {
        background: jest.fn(),
        colorMode: jest.fn(),
        createImage: jest.fn().mockReturnValue({
            loadPixels: jest.fn(),
            width: 1,
            height: 1,
        }),
        fill: jest.fn(),
        image: jest.fn(),
        line: jest.fn(),
        loadImage: jest.fn(),
        noStroke: jest.fn(),
        noTint: jest.fn(),
        pop: jest.fn(),
        push: jest.fn(),
        rect: jest.fn(),
        stroke: jest.fn(),
        strokeWeight: jest.fn(),
        text: jest.fn(),
        textAlign: jest.fn(),
        textSize: jest.fn(),
        tint: jest.fn(),
        translate: jest.fn(),
        beginShape: jest.fn(),
        endShape: jest.fn(),
        vertex: jest.fn(),
        windowWidth: jest.fn().mockReturnValue(16 * 12),
        windowHeight: jest.fn().mockReturnValue(9 * 12),
    }
})

export const mockedP5 = () => {
    return new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>
}

export const mockImageUI = () => {
    const imageUI = new (<new (options: any) => ImageUI>ImageUI)(
        {}
    ) as jest.Mocked<ImageUI>
    imageUI.area = RectAreaService.new({
        left: 10,
        right: 20,
        top: 10,
        bottom: 20,
    })
    imageUI.draw = jest.fn()
    return imageUI
}

export const mockResourceHandler = (graphics: GraphicsBuffer) => {
    const handler = new (<new (options: any) => ResourceHandler>(
        ResourceHandler
    ))({
        imageLoader: new StubImmediateLoader(graphics),
    }) as jest.Mocked<ResourceHandler>

    handler.loadResources = jest.fn()
    handler.getResource = jest
        .fn()
        .mockReturnValue(makeResult(graphics.createImage(1, 1)))
    handler.isResourceLoaded = jest.fn().mockReturnValueOnce(true)
    handler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(true)
    return handler
}

export class MockedP5GraphicsBuffer implements GraphicsBuffer {
    mockedP5: p5

    constructor() {
        this.mockedP5 = mockedP5()
    }

    get height(): number {
        return this.mockedP5.windowHeight
    }

    get width(): number {
        return this.mockedP5.windowWidth
    }

    background(hue: number, saturation: number, brightness: number): void {
        this.mockedP5.background(hue, saturation, brightness)
    }

    beginShape(): void {
        this.mockedP5.beginShape()
    }

    colorMode(
        modeKey: string,
        hueMaximumValue: number,
        saturationMaximumValue: number,
        brightnessMaximumValue: number,
        alphaMaximumValue: number
    ): void {
        this.mockedP5.colorMode(
            modeKey,
            hueMaximumValue,
            saturationMaximumValue,
            brightnessMaximumValue,
            alphaMaximumValue
        )
    }

    createImage(height: number, width: number): p5.Image {
        return this.mockedP5.createImage(width, height)
    }

    endShape(mode: string): void {
        this.mockedP5.endShape(mode as p5.END_MODE)
    }

    fill(
        hue: number,
        saturation: number,
        brightness: number,
        alpha?: number
    ): void {
        this.mockedP5.fill(hue, saturation, brightness, alpha)
    }

    image(
        data: p5.Image,
        left: number,
        top: number,
        width?: number,
        height?: number
    ): void {
        this.mockedP5.image(data, left, top, width, height)
    }

    line(x1: number, y1: number, x2: number, y2: number): void {
        this.mockedP5.line(x1, y1, x2, y2)
    }

    loadImage(
        pathToImage: string,
        successCallback: (loadedImage: p5.Image) => void,
        failureCallback: (failEvent: Event) => void
    ): void {
        this.mockedP5.loadImage(pathToImage, successCallback, failureCallback)
    }

    noFill(): void {
        this.mockedP5.noFill()
    }

    noStroke(): void {
        this.mockedP5.noStroke()
    }

    noTint(): void {
        this.mockedP5.noTint()
    }

    pop(): void {
        this.mockedP5.pop()
    }

    push(): void {
        this.mockedP5.push()
    }

    rect(left: number, top: number, width: number, height: number): void {
        this.mockedP5.rect(left, top, width, height)
    }

    stroke(hue: number, saturation: number, brightness: number): void {
        this.mockedP5.stroke(hue, saturation, brightness)
    }

    strokeWeight(weight: number): void {
        this.mockedP5.strokeWeight(weight)
    }

    text(text: string, x1: number, y1: number, x2: number, y2: number): void {
        this.mockedP5.text(text, x1, y1, x2, y2)
    }

    textAlign(horizontalAlignment: string, verticalAlignment: string): void {
        this.mockedP5.textAlign(
            horizontalAlignment as p5.HORIZ_ALIGN,
            verticalAlignment as p5.VERT_ALIGN
        )
    }

    textSize(size: number): void {
        this.mockedP5.textSize(size)
    }

    textWidth(text: string): number {
        return this.mockedP5.textWidth(text)
    }

    tint(
        hue: number,
        saturation: number,
        brightness: number,
        alpha: number
    ): void {
        this.mockedP5.tint(hue, saturation, brightness, alpha)
    }

    translate(x: number, y: number): void {
        this.mockedP5.translate(x, y)
    }

    vertex(x: number, y: number): void {
        this.mockedP5.vertex(x, y)
    }
}

export class MockedP5GraphicsRenderer
    extends MockedP5GraphicsBuffer
    implements GraphicsRenderer
{
    mockedP5: p5

    constructor() {
        super()
        this.mockedP5 = mockedP5()
    }

    get p() {
        return this.mockedP5
    }

    get height(): number {
        return this.mockedP5.windowHeight
    }

    get width(): number {
        return this.mockedP5.windowWidth
    }

    windowWidth(): number {
        return this.mockedP5.windowWidth
    }

    windowHeight(): number {
        return this.mockedP5.windowHeight
    }
}
