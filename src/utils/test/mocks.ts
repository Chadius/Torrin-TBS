import p5 from "p5"
import { ResourceHandler } from "../../resource/resourceHandler"
import { StubImmediateLoader } from "../../resource/resourceHandlerTestUtils"
import { GraphicsBuffer } from "../graphics/graphicsRenderer"
import { Mocked, MockInstance, vi } from "vitest"

vi.mock("p5", () => {
    return {
        default: vi.fn(() => ({
            background: vi.fn(),
            colorMode: vi.fn(),
            createImage: vi.fn().mockReturnValue({
                loadPixels: vi.fn(),
                width: 1,
                height: 1,
                copy: vi.fn(),
            }),
            createA: vi.fn(),
            fill: vi.fn(),
            image: vi.fn(),
            line: vi.fn(),
            loadImage: vi.fn(),
            noFill: vi.fn(),
            noStroke: vi.fn(),
            noTint: vi.fn(),
            pop: vi.fn(),
            push: vi.fn(),
            rect: vi.fn(),
            circle: vi.fn(),
            stroke: vi.fn(),
            strokeWeight: vi.fn(),
            text: vi.fn(),
            textAlign: vi.fn(),
            textSize: vi.fn(),
            textWidth: vi.fn().mockReturnValue(10),
            textAscent: vi.fn().mockReturnValue(12),
            textDescent: vi.fn().mockReturnValue(13),
            tint: vi.fn(),
            translate: vi.fn(),
            beginShape: vi.fn(),
            endShape: vi.fn(),
            vertex: vi.fn(),
            windowWidth: vi.fn().mockReturnValue(16 * 12),
            windowHeight: vi.fn().mockReturnValue(9 * 12),
        })),
    }
})

export const mockedP5 = () => {
    return new p5(undefined, undefined)
}

export const mockResourceHandler = (graphics: GraphicsBuffer) => {
    const handler = new (<new (options: any) => ResourceHandler>(
        ResourceHandler
    ))({
        imageLoader: new StubImmediateLoader(graphics),
    }) as Mocked<ResourceHandler>

    handler.loadResources = vi.fn()
    handler.getResource = vi.fn().mockReturnValue(graphics.createImage(32, 32))
    handler.isResourceLoaded = vi.fn().mockReturnValue(true)
    handler.areAllResourcesLoaded = vi.fn().mockReturnValue(true)
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

    rect(
        left: number,
        top: number,
        width: number,
        height: number,
        topLeftRadius?: number,
        topRightRadius?: number,
        bottomRightRadius?: number,
        bottomLeftRadius?: number
    ): void {
        this.mockedP5.rect(
            left,
            top,
            width,
            height,
            topLeftRadius,
            topRightRadius,
            bottomRightRadius,
            bottomLeftRadius
        )
    }

    circle(x: number, y: number, d: number): void {
        this.mockedP5.circle(x, y, d)
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

    textSize(fontSize: number): void {
        this.mockedP5.textSize(fontSize)
    }

    textWidth(text: string): number {
        return this.mockedP5.textWidth(text)
    }

    textAscent(): number {
        return this.mockedP5.textAscent()
    }

    textDescent(): number {
        return this.mockedP5.textDescent()
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

export const mockConsoleWarn = () => {
    return vi.spyOn(console, "warn").mockImplementation(() => {})
}

export const MockedGraphicsBufferService = {
    addSpies: (mockP5GraphicsContext: GraphicsBuffer) => {
        let graphicsBufferSpies: { [key: string]: MockInstance } = {}
        graphicsBufferSpies["text"] = vi
            .spyOn(mockP5GraphicsContext, "text")
            .mockReturnValue()
        graphicsBufferSpies["image"] = vi
            .spyOn(mockP5GraphicsContext, "image")
            .mockReturnValue()
        graphicsBufferSpies["createImage"] = vi.spyOn(
            mockP5GraphicsContext,
            "createImage"
        )
        graphicsBufferSpies["rect"] = vi
            .spyOn(mockP5GraphicsContext, "rect")
            .mockReturnValue()
        graphicsBufferSpies["circle"] = vi
            .spyOn(mockP5GraphicsContext, "circle")
            .mockReturnValue()
        graphicsBufferSpies["fill"] = vi
            .spyOn(mockP5GraphicsContext, "fill")
            .mockReturnValue()
        graphicsBufferSpies["line"] = vi
            .spyOn(mockP5GraphicsContext, "line")
            .mockReturnValue()
        graphicsBufferSpies["textWidth"] = vi
            .spyOn(mockP5GraphicsContext, "textWidth")
            .mockReturnValue(10)
        graphicsBufferSpies["stroke"] = vi.spyOn(
            mockP5GraphicsContext,
            "stroke"
        )
        graphicsBufferSpies["noStroke"] = vi.spyOn(
            mockP5GraphicsContext,
            "noStroke"
        )
        graphicsBufferSpies["strokeWeight"] = vi.spyOn(
            mockP5GraphicsContext,
            "strokeWeight"
        )
        graphicsBufferSpies["tint"] = vi.spyOn(mockP5GraphicsContext, "tint")
        return graphicsBufferSpies
    },
    resetSpies: (graphicsBufferSpies: { [key: string]: MockInstance }) => {
        Object.values(graphicsBufferSpies ?? {}).forEach((spy) => {
            spy.mockRestore()
        })
    },
}
