import {ResourceHandler, ResourceHandlerService, ResourceLocator, ResourceType} from "./resourceHandler";
import {StubImmediateLoader} from "./resourceHandlerTestUtils";
import {GraphicImageWithStringAsData, MockedP5GraphicsContext} from "../utils/test/mocks";
import * as DataLoader from "../dataLoader/dataLoader";
import {GraphicImage} from "../utils/graphics/graphicsContext";

describe('Resource Handler', () => {
    it('can load an individual resource', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });
        const error = loader.loadResource("some_image_key");
        expect(error).toBeUndefined();

        const imageData = loader.getResource("some_image_key");
        expect(imageData).toStrictEqual(new GraphicImageWithStringAsData("stubImage for some_image_key"));
    });
    it('can load a list of resources', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
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
                }
            ],
        });
        const errors = loader.loadResources(["key1", "key2"]);
        expect(errors).toHaveLength(0);

        const image1Data = loader.getResource("key1");
        expect(image1Data).toStrictEqual(new GraphicImageWithStringAsData("stubImage for key1"));

        const image2Data = loader.getResource("key2");
        expect(image2Data).toStrictEqual(new GraphicImageWithStringAsData("stubImage for key2"));
    });
    it('returns an error if resource key is unknown', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });
        const error = loader.loadResource("different_key");
        expect(error.message.includes("resource key does not exist: different_key")).toBeTruthy();

        const errors = loader.loadResources(["different_key"]);
        expect(errors).toHaveLength(1);
        expect(errors[0].message.includes("resource key does not exist: different_key")).toBeTruthy();
    });

    describe('return defaults if the resource has not been loaded', () => {
        let loader: ResourceHandler;
        let imageLoader: StubImmediateLoader;
        let imageLoaderSpy: jest.SpyInstance;
        let consoleWarnSpy: jest.SpyInstance;

        beforeEach(() => {
            imageLoader = new StubImmediateLoader();
            loader = ResourceHandlerService.new({
                graphicsContext: new MockedP5GraphicsContext(),
                imageLoader,
                resourceLocators: [
                    {
                        type: ResourceType.IMAGE,
                        path: "path/to/image",
                        key: "some_image_key",
                    }
                ]
            });

            imageLoaderSpy = jest.spyOn(imageLoader, "loadResource");
            consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        });

        it('returns a default image and attempts a reload if the image has not been loaded yet', () => {
            const defaultGraphicImage: GraphicImage = loader.getResource("some_image_key");
            expect(defaultGraphicImage.height).toEqual(1);
            expect(defaultGraphicImage.width).toEqual(1);
            expect(imageLoaderSpy).toBeCalledWith("some_image_key", loader);
            expect(consoleWarnSpy).toBeCalledWith(`getResource: "some_image_key" was not loaded, will retry and return placeholder image`);
        });
    });
    it('indicates when all resources have been loaded', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });

        expect(loader.areAllResourcesLoaded()).toBeFalsy();
        loader.loadResource("some_image_key");
        expect(loader.areAllResourcesLoaded()).toBeTruthy();
    });
    it('indicates when a given list of resources have been loaded', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
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
                }
            ]
        });

        expect(loader.areAllResourcesLoaded(["image1"])).toBeFalsy();
        loader.loadResource("image1");
        expect(loader.areAllResourcesLoaded(["image1"])).toBeTruthy();
        expect(loader.areAllResourcesLoaded(["image1", "image2"])).toBeFalsy();
    });
    it('indicates when a single resource has been loaded', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
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
                }
            ]
        });

        expect(loader.isResourceLoaded("image1")).toBeFalsy();
        loader.loadResource("image1");
        expect(loader.isResourceLoaded("image1")).toBeTruthy();
        expect(loader.isResourceLoaded("image2")).toBeFalsy();
    });
    it('can forget an individual resource key', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });
        const error = loader.loadResource("some_image_key");
        expect(error).toBeUndefined();

        loader.deleteResource("some_image_key");

        const defaultImage = loader.getResource("some_image_key");
        expect(defaultImage.height).toEqual(1);
        expect(defaultImage.width).toEqual(1);
    });
    it('can forget a list of resource keys', () => {
        const loader = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
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
                }
            ],
        });

        const errors = loader.loadResources(["image1", "image2"]);
        expect(errors).toHaveLength(0);

        loader.deleteResources(["image1"]);

        const defaultImage1 = loader.getResource("image1");
        expect(defaultImage1.height).toEqual(1);
        expect(defaultImage1.width).toEqual(1);

        const image2Data = loader.getResource("image2");
        expect(image2Data).toStrictEqual(new GraphicImageWithStringAsData("stubImage for image2"));
    });

    describe('load resource locations', () => {
        it('knows it does not have resource locations upon creation', () => {
            const resourceHandler = ResourceHandlerService.new({
                graphicsContext: new MockedP5GraphicsContext(),
                imageLoader: new StubImmediateLoader()
            })

            expect(ResourceHandlerService.hasResourceLocations(resourceHandler)).toBeFalsy();
        });
        it('assumes it has all resource locations upon creation if locations are provided', () => {
            const resourceHandler = ResourceHandlerService.new({
                graphicsContext: new MockedP5GraphicsContext(),
                imageLoader: new StubImmediateLoader(),
                resourceLocators: [
                    {
                        type: ResourceType.IMAGE,
                        key: "Cool pic",
                        path: "/path/to/cool_pic.png",
                    }
                ],
            })

            expect(ResourceHandlerService.hasResourceLocations(resourceHandler)).toBeTruthy();
        });
        it('can try to load resource locations from a file asynchronously', async () => {
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
            ];

            const loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(
                resourceLocators
            );

            const resourceHandler = ResourceHandlerService.new({
                graphicsContext: new MockedP5GraphicsContext(),
                imageLoader: new StubImmediateLoader(),
            })

            await ResourceHandlerService.loadResourceLocations(resourceHandler, "/path/to/resource_locations.json");

            expect(loadFileIntoFormatSpy).toBeCalled();
            expect(ResourceHandlerService.hasResourceLocations(resourceHandler)).toBeTruthy();
            expect(resourceLocators.every(r => r.key in resourceHandler.resourcesByKey)).toBeTruthy();
        });
    });
});
