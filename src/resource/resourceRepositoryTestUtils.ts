import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer.ts"
import { P5ImageLoader } from "./p5ImageLoader.ts"
import {
    ResourceRepositoryScope,
    ResourceRepositoryService,
} from "./resourceRepository.ts"
import { LoadCampaignData } from "../utils/fileHandling/loadCampaignData.ts"

export class TestLoadImmediatelyImageLoader implements P5ImageLoader {
    urlsThatWillAlwaysFailToLoad: Set<string>
    urlsThatTakeTwoAttemptsToLoad: {
        [_: string]: number
    }
    imageSize: {
        width: number
        height: number
    }

    constructor({
        urlsThatWillAlwaysFailToLoad,
        urlsThatTakeTwoAttemptsToLoad,
        imageSize,
    }: {
        urlsThatWillAlwaysFailToLoad?: string[]
        urlsThatTakeTwoAttemptsToLoad?: string[]
        imageSize?: {
            width: number
            height: number
        }
    }) {
        this.urlsThatWillAlwaysFailToLoad = new Set(
            urlsThatWillAlwaysFailToLoad ?? []
        )
        this.urlsThatTakeTwoAttemptsToLoad = Object.fromEntries(
            (urlsThatTakeTwoAttemptsToLoad ?? []).map((url) => [url, 0])
        )
        this.imageSize = imageSize ?? {
            width: 1,
            height: 1,
        }
    }

    loadImage({
        key,
        url,
        graphics,
    }: {
        key: string
        url: string
        graphics: GraphicsBuffer
    }): Promise<{
        key: string
        image: p5.Image
    }> {
        return new Promise((resolve, reject) => {
            if (this.urlsThatWillAlwaysFailToLoad.has(url))
                reject({
                    key,
                    message: `[TestLoadImmediatelyImageLoader.loadImage]: Will always Fail to load ${url}`,
                })
            if (this.urlsThatTakeTwoAttemptsToLoad[url] < 2) {
                this.urlsThatTakeTwoAttemptsToLoad[url] += 1
                reject({
                    key,
                    message: `[TestLoadImmediatelyImageLoader.loadImage]: Takes 2 attempts to load ${url}`,
                })
            }
            resolve({
                key,
                image: graphics.createImage(
                    this.imageSize.width,
                    this.imageSize.height
                ),
            })
        })
    }
}

export const ResourceRepositoryTestUtilsService = {
    getResourceRepositoryWithAllTestImages: async ({
        graphics,
        imageSize,
    }: {
        graphics: GraphicsBuffer
        imageSize?: {
            width: number
            height: number
        }
    }) => {
        const loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({
            imageSize,
        })
        let resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })
        resourceRepository = ResourceRepositoryService.queueImages({
            resourceRepository,
            imagesToQueue: LoadCampaignData.getResourceKeys().map((key) => ({
                key,
                scope: ResourceRepositoryScope.BATTLE,
            })),
        })
        resourceRepository =
            ResourceRepositoryService.beginLoadingAllQueuedImages({
                resourceRepository,
                graphics,
            })
        resourceRepository =
            await ResourceRepositoryService.blockUntilLoadingCompletes({
                resourceRepository,
            })
        return resourceRepository
    },
}
