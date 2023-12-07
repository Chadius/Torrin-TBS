import p5 from "p5";
import {ImageUI} from "../../ui/imageUI";
import {ResourceHandler} from "../../resource/resourceHandler";
import {StubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {BattleSquaddieSelectedHUD} from "../../battle/battleSquaddieSelectedHUD";
import {SquaddieEndTurnAction} from "../../battle/history/squaddieEndTurnAction";
import {RectAreaHelper} from "../../ui/rectArea";
import {GraphicImage, GraphicsContext} from "../graphics/graphicsContext";
import {makeResult} from "../ResultOrError";

jest.mock('p5', () => () => {
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
});

export const mockedP5 = () => {
    return new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
}

export const mockImageUI = () => {
    const imageUI = new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>;
    imageUI.area = RectAreaHelper.new({left: 10, right: 20, top: 10, bottom: 20});
    imageUI.draw = jest.fn();
    return imageUI;
}

export const mockResourceHandler = () => {
    const handler = new (
        <new (options: any) => ResourceHandler>ResourceHandler
    )({
        imageLoader: new StubImmediateLoader(),
    }) as jest.Mocked<ResourceHandler>;

    handler.loadResources = jest.fn();
    handler.getResource = jest.fn().mockReturnValue(makeResult(new GraphicImageWithStringAsData("data")));
    handler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(true);
    return handler;
}

export const battleSquaddieSelectedHUD = () => {
    const hud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
    hud.draw = jest.fn();
    hud.wasAnyActionSelected = jest.fn().mockReturnValue(true);
    hud.getSelectedAction = jest.fn().mockReturnValue(new SquaddieEndTurnAction({}));
    hud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
    hud.didMouseClickOnHUD = jest.fn().mockReturnValue(true);
    hud.mouseClicked = jest.fn();
    return hud;
}

export class MockedP5GraphicsContext implements GraphicsContext {
    mockedP5: p5;

    constructor() {
        this.mockedP5 = mockedP5();
    }

    background(hue: number, saturation: number, brightness: number): void {
        this.mockedP5.background(hue, saturation, brightness);
    }

    beginShape(): void {
        this.mockedP5.beginShape();
    }

    colorMode(modeKey: string, hueMaximumValue: number, saturationMaximumValue: number, brightnessMaximumValue: number, alphaMaximumValue: number): void {
        this.mockedP5.colorMode(modeKey, hueMaximumValue, saturationMaximumValue, brightnessMaximumValue, alphaMaximumValue);
    }

    createImage(height: number, width: number): GraphicImage {
        return this.mockedP5.createImage(width, height);
    }

    endShape(mode: string): void {
        this.mockedP5.endShape(mode as p5.END_MODE);
    }

    fill({hsb, color}: {
        hsb?: number[];
        color?: string
    }): void {
        if (hsb) {
            this.mockedP5.fill(hsb[0], hsb[1], hsb[2]);
            return;
        }
        if (color) {
            this.mockedP5.fill(color);
        }
    }

    image(data: GraphicImage, left: number, top: number, width?: number, height?: number): void {
        this.mockedP5.image(data as p5.Image, left, top, width, height);
    }

    line(x1: number, y1: number, x2: number, y2: number): void {
        this.mockedP5.line(x1, y1, x2, y2);
    }

    loadImage(pathToImage: string, successCallback: () => {}, failureCallback: () => {}): void {
        this.mockedP5.loadImage(pathToImage, successCallback, failureCallback);
    }

    noFill(): void {
        this.mockedP5.noFill();
    }

    noStroke(): void {
        this.mockedP5.noStroke();
    }

    noTint(): void {
        this.mockedP5.noTint();
    }

    pop(): void {
        this.mockedP5.pop();
    }

    push(): void {
        this.mockedP5.push();
    }

    rect(left: number, top: number, width: number, height: number): void {
        this.mockedP5.rect(left, top, width, height);
    }

    stroke({hsb, color}: {
        hsb?: number[];
        color?: string
    }): void {
        if (hsb) {
            this.mockedP5.stroke(hsb[0], hsb[1], hsb[2]);
            return;
        }
        if (color) {
            this.mockedP5.stroke(color);
        }
    }

    strokeWeight(weight: number): void {
        this.mockedP5.strokeWeight(weight);
    }

    text(text: string, x1: number, y1: number, x2: number, y2: number): void {
        this.mockedP5.text(text, x1, y1, x2, y2);
    }

    textAlign(horizontalAlignment: string, verticalAlignment: string): void {
        this.mockedP5.textAlign(horizontalAlignment as p5.HORIZ_ALIGN, verticalAlignment as p5.VERT_ALIGN);
    }

    textSize(size: number): void {
        this.mockedP5.textSize(size);
    }

    tint(hue: number, saturation: number, brightness: number, alpha: number): void {
        this.mockedP5.tint(hue, saturation, brightness, alpha);
    }

    translate(x: number, y: number): void {
        this.mockedP5.translate(x, y);
    }

    vertex(x: number, y: number): void {
        this.mockedP5.vertex(x, y);
    }

    windowHeight(): number {
        return this.mockedP5.windowHeight;
    }

    windowWidth(): number {
        return this.mockedP5.windowWidth;
    }
}

export class GraphicImageWithStringAsData implements GraphicImage {
    data: string;

    constructor(data: string) {
        this.data = data;
    }

    get height(): number {
        return 1;
    }

    get width(): number {
        return 1;
    }

    loadPixels(): void {
    }
}
