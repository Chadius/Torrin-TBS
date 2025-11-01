import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
    MockInstance,
} from "vitest"
import { TestLoadImmediatelyImageLoader } from "./resourceRepositoryTestUtils.ts"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer.ts"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../utils/test/mocks.ts"
import {
    ResourceRepository,
    ResourceRepositoryScope,
    ResourceRepositoryService,
    ResourceRepositoryStatus,
} from "./resourceRepository.ts"
import * as DataLoader from "../dataLoader/dataLoader.ts"
import { Resource, ResourceLocator } from "./resourceLocator.ts"

describe("Resource Repository", () => {
    let loadImmediatelyImageLoader: TestLoadImmediatelyImageLoader
    let resourceRepository: ResourceRepository
    let graphics: GraphicsBuffer
    let graphicsSpies: { [_: string]: MockInstance }
    let urls: { [_: string]: string }

    beforeEach(() => {
        graphics = new MockedP5GraphicsBuffer()
        graphicsSpies = MockedGraphicsBufferService.addSpies(graphics)
        urls = {
            "test-image0": "url-test-image0",
            "test-image1": "url-test-image1",
            "test-image2": "url-test-image2",
            "test-image3": "url-test-image3",
        }
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsSpies)
    })

    describe("queueing", () => {
        beforeEach(() => {
            loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
            resourceRepository = ResourceRepositoryService.new({
                imageLoader: loadImmediatelyImageLoader,
                urls,
            })
        })

        it("can queue several images without loading them", () => {
            const newResourceRepository = ResourceRepositoryService.queueImages(
                {
                    resourceRepository,
                    imagesToQueue: [
                        {
                            key: "test-image0",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                        {
                            key: "test-image1",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                        {
                            key: "test-image2",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                        {
                            key: "test-image3",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                    ],
                }
            )

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository: newResourceRepository,
                    key: "test-image0",
                })
            ).toEqual(
                expect.objectContaining({
                    status: ResourceRepositoryStatus.QUEUED,
                    url: urls["test-image0"],
                    scopes: [ResourceRepositoryScope.BATTLE],
                })
            )
        })
        it("can queue with multiple scopes", () => {
            const newResourceRepository = ResourceRepositoryService.queueImages(
                {
                    resourceRepository,
                    imagesToQueue: [
                        {
                            key: "test-image0",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                    ],
                }
            )
            const newResourceRepository2 =
                ResourceRepositoryService.queueImages({
                    resourceRepository: newResourceRepository,
                    imagesToQueue: [
                        {
                            key: "test-image0",
                            scope: ResourceRepositoryScope.PLAYER_ARMY,
                        },
                    ],
                })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository: newResourceRepository2,
                    key: "test-image0",
                })
            ).toEqual(
                expect.objectContaining({
                    status: ResourceRepositoryStatus.QUEUED,
                    url: urls["test-image0"],
                    scopes: [
                        ResourceRepositoryScope.BATTLE,
                        ResourceRepositoryScope.PLAYER_ARMY,
                    ],
                })
            )
        })
        it("will not add the same queue multiple times", () => {
            const newResourceRepository = ResourceRepositoryService.queueImages(
                {
                    resourceRepository,
                    imagesToQueue: [
                        {
                            key: "test-image0",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                    ],
                }
            )
            const newResourceRepository2 =
                ResourceRepositoryService.queueImages({
                    resourceRepository: newResourceRepository,
                    imagesToQueue: [
                        {
                            key: "test-image0",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                    ],
                })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository: newResourceRepository2,
                    key: "test-image0",
                })
            ).toEqual(
                expect.objectContaining({
                    status: ResourceRepositoryStatus.QUEUED,
                    url: urls["test-image0"],
                    scopes: [ResourceRepositoryScope.BATTLE],
                })
            )
        })
        it("will throw an error if the resource does not have a url", () => {
            expect(() => {
                ResourceRepositoryService.queueImages({
                    resourceRepository,
                    imagesToQueue: [
                        {
                            key: "key does not exist",
                            scope: ResourceRepositoryScope.BATTLE,
                        },
                    ],
                })
            }).toThrow("No url found")
        })
    })
    describe("loading behavior", () => {
        let loadImageSpy: MockInstance
        let queuedResourceRepository: ResourceRepository
        let loadingResourceRepository: ResourceRepository

        beforeEach(() => {
            loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({
                urlsThatWillAlwaysFailToLoad: ["url-test-image1"],
            })
            loadImageSpy = vi.spyOn(loadImmediatelyImageLoader, "loadImage")
            resourceRepository = ResourceRepositoryService.new({
                imageLoader: loadImmediatelyImageLoader,
                urls,
            })

            queuedResourceRepository = ResourceRepositoryService.queueImages({
                resourceRepository,
                imagesToQueue: [
                    {
                        key: "test-image0",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                    {
                        key: "test-image1",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                ],
            })
        })

        afterEach(() => {
            loadImageSpy.mockRestore()
        })

        it("will mark all files as loading", () => {
            loadingResourceRepository =
                ResourceRepositoryService.beginLoadingAllQueuedImages({
                    graphics,
                    resourceRepository: queuedResourceRepository,
                })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository: loadingResourceRepository,
                    key: "test-image0",
                })
            ).toEqual(
                expect.objectContaining({
                    status: ResourceRepositoryStatus.LOADING_IN_PROGRESS,
                })
            )
            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository: loadingResourceRepository,
                    key: "test-image1",
                })
            ).toEqual(
                expect.objectContaining({
                    status: ResourceRepositoryStatus.LOADING_IN_PROGRESS,
                })
            )
        })
        it("will attempt to begin loading all queued images", () => {
            loadingResourceRepository =
                ResourceRepositoryService.beginLoadingAllQueuedImages({
                    graphics,
                    resourceRepository: queuedResourceRepository,
                })
            expect(
                Object.keys(loadingResourceRepository.loadingImagePromises)
            ).toHaveLength(2)
            expect(loadImageSpy).toHaveBeenCalledTimes(2)
            expect(loadImageSpy).toHaveBeenCalledWith(
                expect.objectContaining({ url: "url-test-image0" })
            )
            expect(loadImageSpy).toHaveBeenCalledWith(
                expect.objectContaining({ url: "url-test-image1" })
            )
        })
        it("will indicate it is still trying to load if there are any promised resources", () => {
            loadingResourceRepository =
                ResourceRepositoryService.beginLoadingAllQueuedImages({
                    graphics,
                    resourceRepository: queuedResourceRepository,
                })
            expect(
                ResourceRepositoryService.isStillLoading(
                    loadingResourceRepository
                )
            ).toBeTruthy()
        })
        it("knows resources have not finished loading", () => {
            expect(
                ResourceRepositoryService.areAllResourcesLoaded({
                    resourceRepository: queuedResourceRepository,
                })
            ).toBeFalsy()
        })

        describe("when the loading completes", () => {
            beforeEach(async () => {
                loadingResourceRepository =
                    ResourceRepositoryService.beginLoadingAllQueuedImages({
                        graphics,
                        resourceRepository: queuedResourceRepository,
                    })

                loadingResourceRepository =
                    await ResourceRepositoryService.blockUntilLoadingCompletes({
                        resourceRepository: loadingResourceRepository,
                    })
            })

            it("has finished loading", () => {
                expect(
                    ResourceRepositoryService.isStillLoading(
                        loadingResourceRepository
                    )
                ).toBeFalsy()
            })
            it("will update status for successful loads", () => {
                expect(
                    ResourceRepositoryService.getStatus({
                        resourceRepository: loadingResourceRepository,
                        key: "test-image0",
                    })
                ).toEqual(
                    expect.objectContaining({
                        status: ResourceRepositoryStatus.LOADING_SUCCESSFUL,
                    })
                )
                expect(
                    ResourceRepositoryService.getImage({
                        resourceRepository: loadingResourceRepository,
                        key: "test-image0",
                    })
                ).toBeDefined()
            })
            it("will update status for failed loads", () => {
                expect(
                    ResourceRepositoryService.getStatus({
                        resourceRepository: loadingResourceRepository,
                        key: "test-image1",
                    })
                ).toEqual(
                    expect.objectContaining({
                        status: ResourceRepositoryStatus.LOADING_FAILED,
                    })
                )
                expect(
                    ResourceRepositoryService.getImage({
                        resourceRepository: loadingResourceRepository,
                        key: "test-image1",
                    })
                ).toBeUndefined()
            })
            it("will report all failed keys and reasons for failure", () => {
                expect(
                    ResourceRepositoryService.getImagesThatFailedToLoad({
                        resourceRepository: loadingResourceRepository,
                    })
                ).toEqual(
                    expect.objectContaining({
                        "test-image1": `[TestLoadImmediatelyImageLoader.loadImage]: Will always Fail to load ${urls["test-image1"]}`,
                    })
                )
            })
            it("will not queue an already loaded image but will add the scope", () => {
                const alreadyQueuedResourceRepository =
                    ResourceRepositoryService.queueImages({
                        resourceRepository: loadingResourceRepository,
                        imagesToQueue: [
                            {
                                key: "test-image0",
                                scope: ResourceRepositoryScope.PLAYER_ARMY,
                            },
                        ],
                    })

                const imageInfo = ResourceRepositoryService.getStatus({
                    resourceRepository: alreadyQueuedResourceRepository,
                    key: "test-image0",
                })
                expect(imageInfo.status).toEqual(
                    ResourceRepositoryStatus.LOADING_SUCCESSFUL
                )
                expect(imageInfo.scopes).toContain(
                    ResourceRepositoryScope.BATTLE
                )
                expect(imageInfo.scopes).toContain(
                    ResourceRepositoryScope.PLAYER_ARMY
                )
            })
            it("knows resources have not finished loading", () => {
                expect(
                    ResourceRepositoryService.areAllResourcesLoaded({
                        resourceRepository,
                    })
                ).toBeTruthy()
            })
        })
    })
    describe("deleting keys", () => {
        let loadImageSpy: MockInstance

        beforeEach(() => {
            loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({
                urlsThatWillAlwaysFailToLoad: ["url-test-image1"],
                urlsThatTakeTwoAttemptsToLoad: ["url-test-image2"],
            })
            loadImageSpy = vi.spyOn(loadImmediatelyImageLoader, "loadImage")
            resourceRepository = ResourceRepositoryService.new({
                imageLoader: loadImmediatelyImageLoader,
                urls,
            })

            resourceRepository = ResourceRepositoryService.queueImages({
                resourceRepository,
                imagesToQueue: [
                    {
                        key: "test-image0",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                    {
                        key: "test-image1",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                    {
                        key: "test-image2",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                    {
                        key: "test-image3",
                        scope: ResourceRepositoryScope.BATTLE,
                    },
                ],
            })

            resourceRepository =
                ResourceRepositoryService.beginLoadingAllQueuedImages({
                    graphics,
                    resourceRepository,
                })

            resourceRepository = ResourceRepositoryService.queueImages({
                resourceRepository,
                imagesToQueue: [
                    {
                        key: "test-image0",
                        scope: ResourceRepositoryScope.PLAYER_ARMY,
                    },
                ],
            })
        })

        afterEach(() => {
            loadImageSpy.mockRestore()
        })

        it("will remove the resource with the given key when deleted", () => {
            resourceRepository = ResourceRepositoryService.deleteKey({
                resourceRepository,
                key: "test-image3",
            })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image3",
                }).status
            ).toEqual(ResourceRepositoryStatus.DOES_NOT_EXIST)

            ResourceRepositoryService.blockUntilLoadingCompletes({
                resourceRepository,
            })
        })

        it("will remove the resources with the given scope when deleted", () => {
            resourceRepository = ResourceRepositoryService.deleteScope({
                resourceRepository,
                scope: ResourceRepositoryScope.BATTLE,
            })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image0",
                }).status
            ).toEqual(ResourceRepositoryStatus.DOES_NOT_EXIST)

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image3",
                })
            ).toBeDefined()
        })

        it("will remove all resources when deleted", () => {
            resourceRepository = ResourceRepositoryService.deleteAll({
                resourceRepository,
            })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image0",
                }).status
            ).toEqual(ResourceRepositoryStatus.DOES_NOT_EXIST)

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image3",
                }).status
            ).toEqual(ResourceRepositoryStatus.DOES_NOT_EXIST)
        })

        it("will not add a resource if the key is removed before it finishes loading", async () => {
            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image2",
                }).status
            ).toEqual(ResourceRepositoryStatus.LOADING_IN_PROGRESS)

            resourceRepository = ResourceRepositoryService.deleteKey({
                resourceRepository,
                key: "test-image2",
            })

            resourceRepository =
                await ResourceRepositoryService.blockUntilLoadingCompletes({
                    resourceRepository,
                })

            expect(
                ResourceRepositoryService.getStatus({
                    resourceRepository,
                    key: "test-image2",
                }).status
            ).toEqual(ResourceRepositoryStatus.DOES_NOT_EXIST)
        })
    })

    it("can populate urls using a resource file", async () => {
        const resourceLocators: ResourceLocator[] = Object.entries(urls).map(
            ([key, path]) => ({ key, path, type: Resource.IMAGE })
        )
        const loadFileIntoFormatSpy = vi
            .spyOn(DataLoader, "LoadFileIntoFormat")
            .mockResolvedValue(resourceLocators)
        const resourceRepositoryFromFile =
            await ResourceRepositoryService.newWithUrlsFromFile({
                imageLoader: loadImmediatelyImageLoader,
                filename: "/path/to/resource_locations.json",
            })
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls,
        })

        expect(resourceRepositoryFromFile.urls).toEqual(resourceRepository.urls)
        expect(loadFileIntoFormatSpy).toHaveBeenCalled()
        loadFileIntoFormatSpy.mockRestore()
    })
})
