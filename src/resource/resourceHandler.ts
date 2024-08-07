import p5 from "p5"
import { LoadFileIntoFormat } from "../dataLoader/dataLoader"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

export enum ResourceType {
    IMAGE = "IMAGE",
}

export type ResourceLocator = {
    key: string
    path?: string
    type: ResourceType
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

    constructor(graphicsBuffer: GraphicsBuffer, p5Instance: p5) {
        this.graphicsBuffer = graphicsBuffer
        this.p5Instance = p5Instance
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
        if (!handler.getResourceLocator(resourceKey)) {
            return
        }

        if (handler.isResourceLoaded(resourceKey)) {
            return
        }

        const path = handler.getResourceLocator(resourceKey).path
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
            (key, handler, p1) => {
                console.log(`Failed to load ${key}`)
            }
        )

        const resourceList = resourceLocators ? [...resourceLocators] : []
        this.resourcesByKey = {}
        addResourceLocators(this, resourceList)
        this.imagesByKey = {}
    }

    loadResources(resourceKeys: string[]): Error[] {
        const errors = resourceKeys.map((key) => {
            return this.loadResource(key)
        })
        return errors.filter((x) => x)
    }

    loadResource(resourceKey: string): Error | undefined {
        const resourceLoadersByType = {
            [ResourceType.IMAGE]: this.imageLoader,
        }

        const resource = this.resourcesByKey[resourceKey]
        if (!resource) {
            return new Error(`resource key does not exist: ${resourceKey}`)
        }

        const resourceLoader = resourceLoadersByType[resource.type]
        if (!resourceLoader) {
            return new Error(
                `no loader exists for resource type: ${resource.type}`
            )
        }

        resourceLoader.loadResource(resourceKey, this)
        return undefined
    }

    getResource(resourceKey: string): p5.Image {
        const resourceType = this.resourcesByKey[resourceKey].type

        if (resourceType === ResourceType.IMAGE) {
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
            console.error(`isResourceLoaded: ${resourceKey} not defined.`)
            return false
        }
        const resourceType = this.resourcesByKey[resourceKey].type

        if (resourceType === ResourceType.IMAGE) {
            return this.imagesByKey[resourceKey]?.image !== undefined
        }

        return false
    }

    deleteResource(resourceKey: string) {
        const storageLocationByType = {
            [ResourceType.IMAGE]: this.imagesByKey,
        }

        const resource = this.resourcesByKey[resourceKey]
        if (!resource) {
            return
        }

        const typeStorage = storageLocationByType[resource.type]
        if (!typeStorage) {
            return
        }

        delete typeStorage[resourceKey]
    }

    deleteResources(resourceKeys: string[]) {
        resourceKeys.forEach((key) => this.deleteResource(key))
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
