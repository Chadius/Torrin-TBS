import {
    ResourceHandler,
    ResourceHandlerService,
    ResourceLocator,
    ResourceType,
} from "./resourceHandler"
import { StubImmediateLoader } from "./resourceHandlerTestUtils"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import * as DataLoader from "../dataLoader/dataLoader"
import p5 from "p5"

describe("Resource Handler", () => {
    let mockedP5Graphics: MockedP5GraphicsBuffer
    beforeEach(() => {
        mockedP5Graphics = new MockedP5GraphicsBuffer()
    })

    it("can load an individual resource", () => {
        const loader = ResourceHandlerService.new({
            graphics: new MockedP5GraphicsBuffer(),
            imageLoader: new StubImmediateLoader(mockedP5Graphics),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                },
            ],
        })
        loader.loadResource("some_image_key")
        expect(loader.unknownKeys).toHaveLength(0)
    })
    it("can load a list of resources", () => {
        const loader = ResourceHandlerService.new({
            graphics: new MockedP5GraphicsBuffer(),
            imageLoader: new StubImmediateLoader(mockedP5Graphics),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image1",
                    key: "key1",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image2",
                    key: "key2",
                },
            ],
        })
        loader.loadResources(["key1", "key2"])
        expect(loader.unknownKeys).toHaveLength(0)
    })
    describe("warn the first time an unknown key is used", () => {
        let resourceHandler: ResourceHandler
        let consoleWarnStub: jest.SpyInstance

        beforeEach(() => {
            resourceHandler = ResourceHandlerService.new({
                graphics: new MockedP5GraphicsBuffer(),
                imageLoader: new StubImmediateLoader(mockedP5Graphics),
                resourceLocators: [
                    {
                        type: ResourceType.IMAGE,
                        path: "path/to/image",
                        key: "some_image_key",
                    },
                ],
            })
            consoleWarnStub = jest.spyOn(console, "warn").mockImplementation()
        })

        afterEach(() => {
            consoleWarnStub.mockRestore()
        })

        const tests = [
            {
                name: "isResourceLoaded",
                action: (resourceHandler: ResourceHandler) => {
                    resourceHandler.isResourceLoaded("unknown resource key")
                },
                expectedWarning:
                    '[resourceHandler.isResourceLoaded] "unknown resource key" not defined.',
            },
            {
                name: "getResource",
                action: (resourceHandler: ResourceHandler) => {
                    resourceHandler.getResource("unknown resource key")
                },
                expectedWarning:
                    '[resourceHandler.getResource] "unknown resource key" not defined.',
            },
            {
                name: "loadResource",
                action: (resourceHandler: ResourceHandler) => {
                    resourceHandler.loadResource("unknown resource key")
                },
                expectedWarning:
                    '[resourceHandler.loadResource] "unknown resource key" not defined.',
            },
        ]

        it.each(tests)(`$name`, ({ action, expectedWarning }) => {
            action(resourceHandler)
            expect(consoleWarnStub).toBeCalledTimes(1)
            expect(consoleWarnStub).toBeCalledWith(expectedWarning)

            action(resourceHandler)
            expect(consoleWarnStub).toBeCalledTimes(1)
        })
    })

    describe("return defaults if the resource has not been loaded", () => {
        let loader: ResourceHandler
        let imageLoader: StubImmediateLoader
        let imageLoaderSpy: jest.SpyInstance
        let consoleWarnSpy: jest.SpyInstance

        beforeEach(() => {
            imageLoader = new StubImmediateLoader(mockedP5Graphics)
            loader = ResourceHandlerService.new({
                graphics: new MockedP5GraphicsBuffer(),
                imageLoader,
                resourceLocators: [
                    {
                        type: ResourceType.IMAGE,
                        path: "path/to/image",
                        key: "some_image_key",
                    },
                ],
            })

            imageLoaderSpy = jest.spyOn(imageLoader, "loadResource")
            consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()
        })

        it("returns a default image and attempts a reload if the image has not been loaded yet", () => {
            const defaultGraphicImage: p5.Image =
                loader.getResource("some_image_key")
            expect(defaultGraphicImage.height).toEqual(1)
            expect(defaultGraphicImage.width).toEqual(1)
            expect(imageLoaderSpy).toBeCalledWith("some_image_key", loader)
            expect(consoleWarnSpy).toBeCalledWith(
                `getResource: "some_image_key" was not loaded, will retry and return placeholder image`
            )
        })
    })
    it("indicates when all resources have been loaded", () => {
        const loader = ResourceHandlerService.new({
            graphics: new MockedP5GraphicsBuffer(),
            imageLoader: new StubImmediateLoader(mockedP5Graphics),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                },
            ],
        })

        expect(loader.areAllResourcesLoaded()).toBeFalsy()
        loader.loadResource("some_image_key")
        expect(loader.areAllResourcesLoaded()).toBeTruthy()
    })
    it("indicates when a given list of resources have been loaded", () => {
        const loader = ResourceHandlerService.new({
            graphics: new MockedP5GraphicsBuffer(),
            imageLoader: new StubImmediateLoader(mockedP5Graphics),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image1",
                    key: "image1",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image2",
                    key: "image2",
                },
            ],
        })

        expect(loader.areAllResourcesLoaded(["image1"])).toBeFalsy()
        loader.loadResource("image1")
        expect(loader.areAllResourcesLoaded(["image1"])).toBeTruthy()
        expect(loader.areAllResourcesLoaded(["image1", "image2"])).toBeFalsy()
    })
    it("indicates when a single resource has been loaded", () => {
        const loader = ResourceHandlerService.new({
            graphics: new MockedP5GraphicsBuffer(),
            imageLoader: new StubImmediateLoader(mockedP5Graphics),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image1",
                    key: "image1",
                },
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image2",
                    key: "image2",
                },
            ],
        })

        expect(loader.isResourceLoaded("image1")).toBeFalsy()
        loader.loadResource("image1")
        expect(loader.isResourceLoaded("image1")).toBeTruthy()
        expect(loader.isResourceLoaded("image2")).toBeFalsy()
    })
    describe("load resource locations", () => {
        it("knows it does not have resource locations upon creation", () => {
            const resourceHandler = ResourceHandlerService.new({
                graphics: new MockedP5GraphicsBuffer(),
                imageLoader: new StubImmediateLoader(mockedP5Graphics),
            })

            expect(
                ResourceHandlerService.hasResourceLocations(resourceHandler)
            ).toBeFalsy()
        })
        it("assumes it has all resource locations upon creation if locations are provided", () => {
            const resourceHandler = ResourceHandlerService.new({
                graphics: new MockedP5GraphicsBuffer(),
                imageLoader: new StubImmediateLoader(mockedP5Graphics),
                resourceLocators: [
                    {
                        type: ResourceType.IMAGE,
                        key: "Cool pic",
                        path: "/path/to/cool_pic.png",
                    },
                ],
            })

            expect(
                ResourceHandlerService.hasResourceLocations(resourceHandler)
            ).toBeTruthy()
        })
        it("can try to load resource locations from a file asynchronously", async () => {
            const resourceLocators: ResourceLocator[] = [
                {
                    type: ResourceType.IMAGE,
                    key: "Cool pic",
                    path: "/path/to/cool_pic.png",
                },
                {
                    type: ResourceType.IMAGE,
                    key: "Cool pic2",
                    path: "/path/to/cool_pic_2.png",
                },
            ]

            const loadFileIntoFormatSpy = jest
                .spyOn(DataLoader, "LoadFileIntoFormat")
                .mockResolvedValue(resourceLocators)

            const resourceHandler = ResourceHandlerService.new({
                graphics: new MockedP5GraphicsBuffer(),
                imageLoader: new StubImmediateLoader(mockedP5Graphics),
            })

            await ResourceHandlerService.loadResourceLocations(
                resourceHandler,
                "/path/to/resource_locations.json"
            )

            expect(loadFileIntoFormatSpy).toBeCalled()
            expect(
                ResourceHandlerService.hasResourceLocations(resourceHandler)
            ).toBeTruthy()
            expect(
                resourceLocators.every(
                    (r) => r.key in resourceHandler.resourcesByKey
                )
            ).toBeTruthy()
        })
    })
})
