import p5 from "p5";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {P5GraphicsContext} from "../utils/graphics/P5GraphicsContext";

export enum ResourceType {
    IMAGE,
}

const resourceTypeToName = {
    [ResourceType.IMAGE]: "IMAGE"
}

export type ResourceLocator = {
    key: string;
    path?: string;
    type: ResourceType;
}

type ImageResource = {
    locator: ResourceLocator;
    image: GraphicImage;
}

type RequiredOptions = {
    allResources: ResourceLocator[];
}

type Options = {
    imageLoader: ResourceTypeLoader;
    graphicsContext: GraphicsContext;
}

export interface ResourceTypeLoader {
    loadResource(resourceKey: string, handler: ResourceHandler): void;

    setCallbacks(
        successCallback: (key: string, handler: ResourceHandler, resource: GraphicImage) => {},
        failureCallback?: (key: string, handler: ResourceHandler, p1: Event) => any
    ): void;
}

class p5ImageLoader implements ResourceTypeLoader {
    graphicsContext: P5GraphicsContext;
    successCallback: (resourceKey: string, handler: ResourceHandler, image: p5.Image) => {};
    failureCallback: (key: string, handler: ResourceHandler, p1: Event) => any;

    constructor(graphicsContext: GraphicsContext) {
        this.graphicsContext = graphicsContext as P5GraphicsContext;
    }

    setCallbacks(
        successCallback: (resourceKey: string, handler: ResourceHandler, image: GraphicImage) => {},
        failureCallback?: (key: string, handler: ResourceHandler, p1: Event) => any
    ) {
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }

    loadResource(resourceKey: string, handler: ResourceHandler): void {
        if (!handler.getResourceLocator(resourceKey)) {
            return;
        }

        if (handler.isResourceLoaded(resourceKey)) {
            return;
        }

        const path = handler.getResourceLocator(resourceKey).path;
        const loader = this;
        this.graphicsContext.loadImage(
            path,
            (loadedImage: p5.Image) => {
                loader.successCallback(resourceKey, handler, loadedImage);
            },
            (p1: Event) => {
                loader.failureCallback(resourceKey, handler, p1);
            }
        );
    }
}

export class ResourceHandler {
    imageLoader: ResourceTypeLoader;
    resourcesByKey: { [key: string]: ResourceLocator };

    imagesByKey: { [key: string]: ImageResource };

    constructor(options: RequiredOptions & Partial<Options>) {
        this.imageLoader = options.imageLoader || new p5ImageLoader(
            options.graphicsContext
        );
        this.imageLoader.setCallbacks(
            this.imageSuccessCallback,
            (key, handler, p1) => {
                console.log(`Failed to load ${key}`);
            }
        )

        const resourceList = options.allResources || [];
        this.resourcesByKey = {};
        resourceList.forEach((res) => {
            this.resourcesByKey[res.key] = res;
        })
        this.imagesByKey = {};
    }

    loadResources(resourceKeys: string[]): Error[] {
        const errors = resourceKeys.map((key) => {
            return this.loadResource(key);
        })
        return errors.filter(x => x);
    }

    loadResource(resourceKey: string): Error | undefined {
        const resourceLoadersByType = {
            [ResourceType.IMAGE]: this.imageLoader,
        }

        const resource = this.resourcesByKey[resourceKey];
        if (!resource) {
            return new Error(`resource key does not exist: ${resourceKey}`);
        }

        const resourceLoader = resourceLoadersByType[resource.type];
        if (!resourceLoader) {
            return new Error(`no loader exists for resource type: ${resourceTypeToName[resource.type]}`);
        }

        resourceLoader.loadResource(resourceKey, this);
        return undefined;
    }

    getResource(resourceKey: string): ResultOrError<GraphicImage, Error> {
        const resourceType = this.resourcesByKey[resourceKey].type;

        if (resourceType === ResourceType.IMAGE) {
            if (!this.imagesByKey[resourceKey]) {
                return makeError(new Error(`resource was not loaded with key: ${resourceKey}`));
            }
            return makeResult(this.imagesByKey[resourceKey].image);
        }

        return undefined;
    }

    imageSuccessCallback(resourceKey: string, resourceHandler: ResourceHandler, loadedImage: GraphicImage): any {
        resourceHandler.imagesByKey[resourceKey] = {
            locator: resourceHandler.resourcesByKey[resourceKey],
            image: loadedImage
        };
    }

    areAllResourcesLoaded(keysToCheck?: string[]): boolean {
        let keys = keysToCheck || Object.keys(this.resourcesByKey);
        return keys.every(this.isResourceLoaded);
    }

    isResourceLoaded = (resourceKey: string): boolean => {
        const resourceType = this.resourcesByKey[resourceKey].type;

        if (
            resourceType === ResourceType.IMAGE
        ) {
            return (
                this.imagesByKey[resourceKey]
                && this.imagesByKey[resourceKey].image
            ) !== undefined;
        }

        return false;
    }

    deleteResource(resourceKey: string) {
        const storageLocationByType = {
            [ResourceType.IMAGE]: this.imagesByKey,
        }

        const resource = this.resourcesByKey[resourceKey];
        if (!resource) {
            return;
        }

        const typeStorage = storageLocationByType[resource.type];
        if (!typeStorage) {
            return;
        }

        delete typeStorage[resourceKey];
    }

    deleteResources(resourceKeys: string[]) {
        resourceKeys.forEach(key => this.deleteResource(key));
    }

    getResourceLocator(key: string): ResourceLocator {
        return this.resourcesByKey[key];
    }
}
