import p5 from "p5"
import { LoadFileIntoFormat } from "../dataLoader/dataLoader"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

export const Resource = {
    IMAGE: "IMAGE",
} as const satisfies Record<string, string>

export type TResource = EnumLike<typeof Resource>

export type ResourceLocator = {
    key: string
    path?: string
    type: TResource
}

type ImageResource = {
    locator: ResourceLocator
    image: p5.Image
}

const createPlaceholderImage = (graphicsContext: GraphicsBuffer): p5.Image => {
    return graphicsContext.createImage(1, 1)
}

export interface ResourceTypeLoader {
    loadResource(resourceKey: string, handler: ResourceHandler): void

    setCallbacks(
        successCallback: (
            key: string,
            handler: ResourceHandler,
            resource: p5.Image
        ) => {},
        failureCallback?: (
            key: string,
            handler: ResourceHandler,
            p1: Event
        ) => any
    ): void
}

class P5ImageLoader implements ResourceTypeLoader {
    graphicsBuffer: GraphicsBuffer
    successCallback: (
        resourceKey: string,
        handler: ResourceHandler,
        image: p5.Image
    ) => {}
    failureCallback: (key: string, handler: ResourceHandler, p1: Event) => any
    p5Instance: p5
    resourceKeysAttemptedToLoad: string[]

    constructor(graphicsBuffer: GraphicsBuffer, p5Instance: p5) {
        this.graphicsBuffer = graphicsBuffer
        this.p5Instance = p5Instance
        this.resourceKeysAttemptedToLoad = []
    }

    setCallbacks(
        successCallback: (
            resourceKey: string,
            handler: ResourceHandler,
            image: p5.Image
        ) => {},
        failureCallback?: (
            key: string,
            handler: ResourceHandler,
            p1: Event
        ) => any
    ) {
        this.successCallback = successCallback
        this.failureCallback = failureCallback
    }

    loadResource(resourceKey: string, handler: ResourceHandler): void {
        if (this.resourceKeysAttemptedToLoad.includes(resourceKey)) {
            return
        }
        this.resourceKeysAttemptedToLoad.push(resourceKey)

        if (handler.isResourceLoaded(resourceKey)) {
            return
        }

        const resourceLocator = handler.getResourceLocator(resourceKey)
        if (!resourceLocator) {
            return
        }

        const path = resourceLocator.path
        const loader = this
        if (this.p5Instance) {
            this.p5Instance.loadImage(
                path,
                (loadedImage: p5.Image) => {
                    loader.successCallback(resourceKey, handler, loadedImage)
                },
                (p1: Event) => {
                    loader.failureCallback(resourceKey, handler, p1)
                }
            )
            return
        }
        this.graphicsBuffer.loadImage(
            path,
            (loadedImage: p5.Image) => {
                loader.successCallback(resourceKey, handler, loadedImage)
            },
            (p1: Event) => {
                loader.failureCallback(resourceKey, handler, p1)
            }
        )
    }
}

export class ResourceHandler {
    imageLoader: ResourceTypeLoader
    resourcesByKey: {
        [key: string]: ResourceLocator
    }

    imagesByKey: {
        [key: string]: ImageResource
    }
    graphicsContext: GraphicsBuffer
    unknownKeys: string[]

    constructor({
        resourceLocators,
        imageLoader,
        graphics,
        p5Instance,
    }: {
        resourceLocators: ResourceLocator[]
        imageLoader?: ResourceTypeLoader
        graphics?: GraphicsBuffer
        p5Instance?: any
    }) {
        this.graphicsContext = graphics
        this.imageLoader =
            imageLoader || new P5ImageLoader(graphics, p5Instance)
        this.imageLoader.setCallbacks(
            this.imageSuccessCallback,
            (key, _handler, _p1) => {
                console.log(`Failed to load ${key}`)
            }
        )

        const resourceList = resourceLocators ? [...resourceLocators] : []
        this.resourcesByKey = {}
        addResourceLocators(this, resourceList)
        this.imagesByKey = {}
        this.unknownKeys = []
    }

    loadResources(resourceKeys: string[]) {
        resourceKeys.forEach((key) => {
            return this.loadResource(key)
        })
    }

    loadResource(resourceKey: string) {
        const resourceLoadersByType = {
            [Resource.IMAGE]: this.imageLoader,
        }

        const resource = this.resourcesByKey[resourceKey]
        if (!resource) {
            this.warnTheFirstTimeAnUnknownResourceKeyIsUsed(
                resourceKey,
                "loadResource"
            )
            return
        }

        const resourceLoader = resourceLoadersByType[resource.type]
        if (!resourceLoader) {
            return
        }

        resourceLoader.loadResource(resourceKey, this)
    }

    getResource(resourceKey: string): p5.Image {
        if (this.resourcesByKey[resourceKey] === undefined) {
            this.warnTheFirstTimeAnUnknownResourceKeyIsUsed(
                resourceKey,
                "getResource"
            )
            return undefined
        }
        const resourceType = this.resourcesByKey[resourceKey].type

        if (resourceType === Resource.IMAGE) {
            if (!this.imagesByKey[resourceKey]) {
                console.warn(
                    `getResource: "${resourceKey}" was not loaded, will retry and return placeholder image`
                )
                this.loadResource(resourceKey)
                return createPlaceholderImage(this.graphicsContext)
            }
            return this.imagesByKey[resourceKey].image
        }

        return undefined
    }

    imageSuccessCallback(
        resourceKey: string,
        resourceHandler: ResourceHandler,
        loadedImage: p5.Image
    ): any {
        resourceHandler.imagesByKey[resourceKey] = {
            locator: resourceHandler.resourcesByKey[resourceKey],
            image: loadedImage,
        }
    }

    areAllResourcesLoaded(keysToCheck?: string[]): boolean {
        let keys = keysToCheck || Object.keys(this.resourcesByKey)
        return keys.every(this.isResourceLoaded)
    }

    isResourceLoaded = (resourceKey: string): boolean => {
        if (this.resourcesByKey[resourceKey] === undefined) {
            this.warnTheFirstTimeAnUnknownResourceKeyIsUsed(
                resourceKey,
                "isResourceLoaded"
            )
            return false
        }
        const resourceType = this.resourcesByKey[resourceKey].type

        if (resourceType === Resource.IMAGE) {
            return this.imagesByKey[resourceKey]?.image !== undefined
        }

        return false
    }

    warnTheFirstTimeAnUnknownResourceKeyIsUsed(
        resourceKey: string,
        functionName: string
    ) {
        if (!this.unknownKeys.includes(resourceKey)) {
            console.warn(
                `[resourceHandler.${functionName}] "${resourceKey}" not defined.`
            )
            this.unknownKeys.push(resourceKey)
        }
    }

    getResourceLocator(key: string): ResourceLocator {
        return this.resourcesByKey[key]
    }
}

export const ResourceHandlerService = {
    new: ({
        imageLoader,
        resourceLocators,
        graphics,
        p5Instance,
    }: {
        imageLoader: ResourceTypeLoader
        resourceLocators?: ResourceLocator[]
        graphics: GraphicsBuffer
        p5Instance?: any
    }): ResourceHandler => {
        return new ResourceHandler({
            imageLoader,
            resourceLocators: resourceLocators ?? [],
            graphics,
            p5Instance,
        })
    },
    hasResourceLocations: (resourceHandler: ResourceHandler): boolean => {
        return Object.values(resourceHandler.resourcesByKey).length > 0
    },
    loadResourceLocations: async (
        resourceHandler: ResourceHandler,
        filename: string
    ) => {
        try {
            const resourceLocators: ResourceLocator[] =
                await LoadFileIntoFormat<ResourceLocator[]>(filename)
            addResourceLocators(resourceHandler, resourceLocators)
        } catch (e) {
            console.error("Error while loading mission from file")
            console.error(e)
        }
    },
    getResource: (
        resourceHandler: ResourceHandler,
        resourceKey: string
    ): p5.Image => {
        return resourceHandler.getResource(resourceKey)
    },
}

const addResourceLocators = (
    resourceHandler: ResourceHandler,
    resourceList: ResourceLocator[]
) => {
    resourceList.forEach((res) => {
        resourceHandler.resourcesByKey[res.key] = res
    })
}
