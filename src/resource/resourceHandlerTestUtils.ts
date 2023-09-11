import {ResourceHandler, ResourceTypeLoader} from "./resourceHandler";
import {GraphicImage} from "../utils/graphics/graphicsContext";
import {GraphicImageWithStringAsData} from "../utils/test/mocks";

export class StubImmediateLoader implements ResourceTypeLoader {
    loadedResource: boolean;
    successCallback: (key: string, handler: ResourceHandler, image: GraphicImage) => {};
    failureCallback: (key: string, handler: ResourceHandler, p1: Event) => any;

    constructor() {
        this.loadedResource = false;
    }

    setCallbacks(
        successCallback: (key: string, handler: ResourceHandler, image: GraphicImage) => {},
        failureCallback?: (key: string, handler: ResourceHandler, p1: Event) => any
    ): void {
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }

    loadResource(resourceKey: string, handler: ResourceHandler): void {
        this.successCallback(resourceKey, handler, new GraphicImageWithStringAsData(`stubImage for ${resourceKey}`));
        this.loadedResource = true;
    }
}
