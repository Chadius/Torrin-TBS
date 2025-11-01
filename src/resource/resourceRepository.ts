import p5 from "p5"
import { EnumLike } from "../utils/enum.ts"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer.ts"
import { P5ImageLoader } from "./p5ImageLoader.ts"
import { ResourceLocator } from "./resourceLocator.ts"
import { LoadFileIntoFormat } from "../dataLoader/dataLoader.ts"

export const ResourceRepositoryScope = {
    NONE: "NONE",
    BATTLE: "BATTLE",
    PLAYER_ARMY: "PLAYER_ARMY",
    CUTSCENE: "CUTSCENE",
    TITLE_SCREEN: "TITLE_SCREEN",
} as const satisfies Record<string, string>
export type TResourceRepositoryScope = EnumLike<typeof ResourceRepositoryScope>

export const ResourceRepositoryStatus = {
    DOES_NOT_EXIST: "DOES_NOT_EXIST",
    UNKNOWN: "UNKNOWN",
    QUEUED: "QUEUED",
    LOADING_IN_PROGRESS: "LOADING_IN_PROGRESS",
    LOADING_SUCCESSFUL: "LOADING_SUCCESSFUL",
    LOADING_FAILED: "LOADING_FAILED",
} as const satisfies Record<string, string>
export type TResourceRepositoryStatus = EnumLike<
    typeof ResourceRepositoryStatus
>

type ResourceData = {
    status: TResourceRepositoryStatus
    url: string
    scopes: TResourceRepositoryScope[]
    reasonForFailedLoad: string | undefined
    image: p5.Image | undefined
}

export interface ResourceRepository {
    images: {
        [key: string]: ResourceData
    }
    imageLoader: P5ImageLoader
    urls: {
        [key: string]: string
    }
    loadingImagePromises: {
        [key: string]: Promise<{
            key: string
            image: p5.Image
        }>
    }
}

export const ResourceRepositoryService = {
    new: ({
        imageLoader,
        urls,
    }: {
        imageLoader: P5ImageLoader
        urls: {
            [_: string]: string
        }
    }): ResourceRepository =>
        newResourceRepository({
            imageLoader,
            urls,
        }),
    newWithUrlsFromFile: async ({
        imageLoader,
        filename,
    }: {
        imageLoader: P5ImageLoader
        filename: string
    }): Promise<ResourceRepository> => {
        let urls: { [_: string]: string } = {}
        try {
            const resourceLocators: ResourceLocator[] =
                await LoadFileIntoFormat<ResourceLocator[]>(filename)
            resourceLocators
                .filter((locator) => locator.path != undefined)
                .forEach((locator) => {
                    if (locator.path) urls[locator.key] = locator.path
                })
        } catch (e) {
            console.error(
                `[ResourceRepositoryService.newWithUrlsFromFile]: Error while loading resource locator file ${filename}`
            )
            console.error(e)
        }

        return newResourceRepository({
            imageLoader,
            urls,
        })
    },
    getStatus: ({
        resourceRepository,
        key,
    }: {
        resourceRepository: ResourceRepository
        key: string
    }): {
        status: TResourceRepositoryStatus
        url: string
        scopes: TResourceRepositoryScope[]
    } => {
        return resourceRepository.images[key]
            ? {
                  status: resourceRepository.images[key].status,
                  url: resourceRepository.images[key].url,
                  scopes: resourceRepository.images[key].scopes,
              }
            : {
                  status: ResourceRepositoryStatus.DOES_NOT_EXIST,
                  url: "",
                  scopes: [],
              }
    },
    queueImages: ({
        resourceRepository,
        imagesToQueue,
    }: {
        resourceRepository: ResourceRepository
        imagesToQueue: { key: string; scope: TResourceRepositoryScope }[]
    }): ResourceRepository => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.queueImages]: resourceRepository must be defined"
            )

        const invalidRecords = imagesToQueue.filter(
            (imageInfo) => resourceRepository.urls[imageInfo.key] == undefined
        )
        if (invalidRecords.length > 0) {
            const invalidKeys = invalidRecords.map((record) => record.key)
            throw new Error(
                `[ResourceRepository.queueImages] No url found for keys: ${invalidKeys.join(", ")}`
            )
        }

        const recordsToAdd = imagesToQueue.filter(
            (imageInfo) => resourceRepository.images[imageInfo.key] == undefined
        )

        const statusesToChangeToQueued = new Set<TResourceRepositoryStatus>([
            ResourceRepositoryStatus.LOADING_FAILED,
            ResourceRepositoryStatus.DOES_NOT_EXIST,
            ResourceRepositoryStatus.UNKNOWN,
        ])
        const recordsToQueue = imagesToQueue.filter(
            (imageInfo) =>
                resourceRepository.images[imageInfo.key] != undefined &&
                !resourceRepository.images[imageInfo.key].scopes.includes(
                    imageInfo.scope
                ) &&
                statusesToChangeToQueued.has(
                    resourceRepository.images[imageInfo.key].status
                )
        )
        const recordsToAddScope = imagesToQueue.filter(
            (imageInfo) =>
                resourceRepository.images[imageInfo.key] != undefined &&
                !resourceRepository.images[imageInfo.key].scopes.includes(
                    imageInfo.scope
                ) &&
                !statusesToChangeToQueued.has(
                    resourceRepository.images[imageInfo.key].status
                )
        )

        let copyRecords = deepCopyImages(resourceRepository)
        copyRecords = queueNewRecordsToImages({
            recordsToAdd: recordsToAdd,
            copyRecords: copyRecords,
            resourceRepository: resourceRepository,
        })
        copyRecords = queueExistingRecordsToImages({
            recordsToUpdate: recordsToQueue,
            copyRecords: copyRecords,
            resourceRepository: resourceRepository,
        })
        copyRecords = addScopeToImageRecord({
            recordsToAddScope,
            copyRecords: copyRecords,
            resourceRepository: resourceRepository,
        })

        return newResourceRepository({
            imageLoader: resourceRepository.imageLoader,
            urls: resourceRepository.urls,
            images: copyRecords,
        })
    },
    beginLoadingAllQueuedImages: ({
        graphics,
        resourceRepository,
    }: {
        graphics: GraphicsBuffer
        resourceRepository: ResourceRepository
    }): ResourceRepository => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepositoryService.loadAllQueuedImages]: resourceRepository must be defined"
            )

        const queuedRecordKeys = Object.entries(resourceRepository.images)
            .filter(
                ([_, info]) => info.status == ResourceRepositoryStatus.QUEUED
            )
            .map(([key, _]) => key)

        const copyImages = deepCopyImages(resourceRepository)

        updateImageStatuses({
            images: copyImages,
            keysToUpdate: queuedRecordKeys,
            newStatus: ResourceRepositoryStatus.LOADING_IN_PROGRESS,
        })

        const imageLoadPromises = Object.fromEntries(
            queuedRecordKeys.map((key) => [
                key,
                resourceRepository.imageLoader.loadImage({
                    graphics,
                    url: resourceRepository.urls[key],
                    key,
                }),
            ])
        )

        return newResourceRepository({
            imageLoader: resourceRepository.imageLoader,
            urls: resourceRepository.urls,
            images: copyImages,
            loadingImagePromises: imageLoadPromises,
        })
    },
    isStillLoading: (resourceRepository: ResourceRepository): boolean =>
        Object.keys(resourceRepository.loadingImagePromises).length > 0,
    areAllResourcesLoaded: ({
        resourceRepository,
    }: {
        resourceRepository: ResourceRepository
    }): boolean => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.areAllResourcesLoaded]: resourceRepository must be defined"
            )
        return Object.entries(resourceRepository.images).every(
            ([_, info]) =>
                info.status == ResourceRepositoryStatus.LOADING_SUCCESSFUL
        )
    },
    blockUntilLoadingCompletes: async ({
        resourceRepository,
    }: {
        resourceRepository: ResourceRepository
    }): Promise<ResourceRepository> => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.blockUntilLoadingCompletes]: resourceRepository must be defined"
            )

        const loadImageResults = await Promise.allSettled(
            Object.values(resourceRepository.loadingImagePromises)
        )

        const copyImages = deepCopyImages(resourceRepository)
        const copyLoadingImagePromises = {
            ...resourceRepository.loadingImagePromises,
        }

        loadImageResults
            .filter((result) => result.status == "fulfilled")
            .forEach((result) => {
                copyImages[result.value.key].image = result.value.image
                copyImages[result.value.key].status =
                    ResourceRepositoryStatus.LOADING_SUCCESSFUL
            })
        loadImageResults
            .filter((result) => result.status == "rejected")
            .forEach((result) => {
                const { key, message } = result.reason
                copyImages[key].reasonForFailedLoad = message
                copyImages[key].status = ResourceRepositoryStatus.LOADING_FAILED
            })

        const fulfilledKeys = loadImageResults
            .filter((result) => result.status == "fulfilled")
            .map((result) => result.value.key)
        const rejectedKeys = loadImageResults
            .filter((result) => result.status == "rejected")
            .map((result) => result.reason.key)

        ;[...fulfilledKeys, ...rejectedKeys].forEach((key) => {
            delete copyLoadingImagePromises[key]
        })

        return newResourceRepository({
            imageLoader: resourceRepository.imageLoader,
            urls: resourceRepository.urls,
            images: copyImages,
            loadingImagePromises: copyLoadingImagePromises,
        })
    },
    getImage: ({
        resourceRepository,
        key,
    }: {
        resourceRepository: ResourceRepository
        key: string
    }): p5.Image | undefined => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.getImage]: resourceRepository must be defined"
            )

        return resourceRepository.images[key]?.image
    },
    getImagesThatFailedToLoad: ({
        resourceRepository,
    }: {
        resourceRepository: ResourceRepository
    }): { [key: string]: string } => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.getImagesThatFailedToLoad]: resourceRepository must be defined"
            )

        return Object.fromEntries(
            Object.entries(resourceRepository.images)
                .filter(
                    ([_, info]) =>
                        info.status == ResourceRepositoryStatus.LOADING_FAILED
                )
                .map(([key, info]) => {
                    return [key, info.reasonForFailedLoad]
                })
                .filter(([_, info]) => info != undefined)
        )
    },
    deleteKey: ({
        resourceRepository,
        key,
    }: {
        resourceRepository: ResourceRepository
        key: string
    }): ResourceRepository => deleteKey({ resourceRepository, key }),
    deleteScope: ({
        resourceRepository,
        scope,
    }: {
        resourceRepository: ResourceRepository
        scope: TResourceRepositoryScope
    }): ResourceRepository => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.deleteScope]: resourceRepository must be defined"
            )

        const keysToDelete = Object.keys(resourceRepository.images).filter(
            (key) => resourceRepository.images[key].scopes.includes(scope)
        )

        keysToDelete.forEach((key) => {
            resourceRepository = deleteKey({ resourceRepository, key })
        })
        return resourceRepository
    },
    deleteAll: ({
        resourceRepository,
    }: {
        resourceRepository: ResourceRepository
    }): ResourceRepository => {
        if (resourceRepository == undefined)
            throw new Error(
                "[ResourceRepository.deleteAll]: resourceRepository must be defined"
            )

        Object.keys(resourceRepository.images).forEach((key) => {
            resourceRepository = deleteKey({ resourceRepository, key })
        })

        return resourceRepository
    },
}

const newResourceRepository = ({
    imageLoader,
    urls,
    images,
    loadingImagePromises,
}: Partial<ResourceRepository> & {
    imageLoader: P5ImageLoader
    urls: {
        [_: string]: string
    }
}): ResourceRepository => {
    return {
        imageLoader,
        images: images ?? {},
        urls,
        loadingImagePromises: loadingImagePromises ?? {},
    }
}

const deepCopyImages = (resourceRepository: ResourceRepository) => {
    return Object.fromEntries(
        Object.entries(resourceRepository.images).map((entry) => {
            const [key, value] = entry
            return [key, { ...value, scopes: [...value.scopes] }]
        })
    )
}

const queueNewRecordsToImages = ({
    recordsToAdd,
    copyRecords,
    resourceRepository,
}: {
    recordsToAdd: { key: string; scope: TResourceRepositoryScope }[]
    copyRecords: {
        [_: string]: ResourceData
    }
    resourceRepository: ResourceRepository
}): { [_: string]: ResourceData } => {
    recordsToAdd.forEach((record) => {
        copyRecords[record.key] = {
            status: ResourceRepositoryStatus.QUEUED,
            scopes: [record.scope],
            image: undefined,
            url: resourceRepository.urls[record.key],
            reasonForFailedLoad: undefined,
        }
    })
    return copyRecords
}

const queueExistingRecordsToImages = ({
    recordsToUpdate,
    copyRecords,
    resourceRepository,
}: {
    recordsToUpdate: { key: string; scope: TResourceRepositoryScope }[]
    copyRecords: {
        [_: string]: ResourceData
    }
    resourceRepository: ResourceRepository
}): { [_: string]: ResourceData } => {
    recordsToUpdate.forEach((record) => {
        copyRecords[record.key] = {
            ...resourceRepository.images[record.key],
            status: ResourceRepositoryStatus.QUEUED,
            scopes: [
                ...resourceRepository.images[record.key].scopes,
                record.scope,
            ],
        }
    })
    return copyRecords
}

const updateImageStatuses = ({
    images,
    newStatus,
    keysToUpdate,
}: {
    images: { [_: string]: { status: TResourceRepositoryStatus } }
    keysToUpdate: string[]
    newStatus: TResourceRepositoryStatus
}) => {
    keysToUpdate.forEach((key) => {
        images[key].status = newStatus
    })
}

const addScopeToImageRecord = ({
    copyRecords,
    recordsToAddScope,
    resourceRepository,
}: {
    recordsToAddScope: { key: string; scope: TResourceRepositoryScope }[]
    copyRecords: {
        [_: string]: ResourceData
    }
    resourceRepository: ResourceRepository
}): { [_: string]: ResourceData } => {
    recordsToAddScope.forEach(({ key, scope }) => {
        copyRecords[key] = {
            ...resourceRepository.images[key],
            scopes: [...resourceRepository.images[key].scopes, scope],
        }
    })
    return copyRecords
}

const deleteKey = ({
    resourceRepository,
    key,
}: {
    resourceRepository: ResourceRepository
    key: string
}): ResourceRepository => {
    if (resourceRepository == undefined)
        throw new Error(
            "[ResourceRepository.deleteKey]: resourceRepository must be defined"
        )

    const copyImages = deepCopyImages(resourceRepository)
    const copyLoadingImagePromises = {
        ...resourceRepository.loadingImagePromises,
    }

    delete copyImages[key]
    delete copyLoadingImagePromises[key]

    return newResourceRepository({
        imageLoader: resourceRepository.imageLoader,
        urls: resourceRepository.urls,
        images: copyImages,
        loadingImagePromises: copyLoadingImagePromises,
    })
}
