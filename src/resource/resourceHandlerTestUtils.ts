import {ResourceHandler, ResourceTypeLoader} from "./resourceHandler";

export class stubImmediateLoader implements ResourceTypeLoader {
    loadedResource: boolean;
    successCallback: (key: string, handler: ResourceHandler, image: string) => {};
    failureCallback: (key: string, handler: ResourceHandler, p1: Event) => any;

    constructor() {
        this.loadedResource = false;
    }

    setCallbacks(
        successCallback: (key: string, handler: ResourceHandler, image: string) => {},
        failureCallback?: (key: string, handler: ResourceHandler, p1: Event) => any
    ): void {
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }

    loadResource(resourceKey: string, handler: ResourceHandler): void {
        this.successCallback(resourceKey, handler, `stubImage for ${resourceKey}`);
        this.loadedResource = true;
    }
}
