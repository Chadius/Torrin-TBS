import {ResourceHandler, ResourceTypeLoader} from "./resourceHandler";
import p5 from "p5";
import {GraphicsBuffer} from "../utils/graphics/graphicsRenderer";

export class StubImmediateLoader implements ResourceTypeLoader {
    loadedResource: boolean;
    successCallback: (key: string, handler: ResourceHandler, image: p5.Image) => {};
    failureCallback: (key: string, handler: ResourceHandler, p1: Event) => any;
    graphics: GraphicsBuffer

    constructor(graphics: GraphicsBuffer) {
        this.loadedResource = false;
        this.graphics = graphics;
    }

    setCallbacks(
        successCallback: (key: string, handler: ResourceHandler, image: p5.Image) => {},
        failureCallback?: (key: string, handler: ResourceHandler, p1: Event) => any
    ): void {
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }

    loadResource(resourceKey: string, handler: ResourceHandler): void {
        this.successCallback(resourceKey, handler, this.graphics.createImage(1, 1));
        this.loadedResource = true;
    }
}
