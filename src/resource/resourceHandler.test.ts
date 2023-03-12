import {ResourceHandler, ResourceType} from "./resourceHandler";
import {stubImmediateLoader} from "./resourceHandlerTestUtils";
import {isError, isResult, unwrapResultOrError} from "../utils/ResultOrError";

describe('Resource Handler', () => {
    it('can load an individual resource', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });
        const error = loader.loadResource("some_image_key");
        expect(error).toBeUndefined();

        const someImage = loader.getResource("some_image_key");
        expect(isResult(someImage)).toBeTruthy();

        const imageData = unwrapResultOrError(someImage);
        expect(imageData).toBe("stubImage for some_image_key");
    });
    it('can load a list of resources', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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
            ]
        });
        const errors = loader.loadResources(["key1", "key2"]);
        expect(errors).toHaveLength(0);

        const image1 = loader.getResource("key1");
        expect(isResult(image1)).toBeTruthy();

        const image1Data = unwrapResultOrError(image1);
        expect(image1Data).toBe("stubImage for key1");

        const image2 = loader.getResource("key2");
        expect(isResult(image2)).toBeTruthy();

        const image2Data = unwrapResultOrError(image2);
        expect(image2Data).toBe("stubImage for key2");
    });
    it('returns an error if resource key is unknown', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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
    it('returns an error if the key does not exist', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "some_image_key",
                }
            ]
        });
        const someImageOrError = loader.getResource("some_image_key");
        expect(isError(someImageOrError)).toBeTruthy();

        const errorFound = unwrapResultOrError(someImageOrError);
        expect(errorFound).toEqual(expect.any(Error));
        expect((errorFound as Error).message.includes("resource was not loaded with key: some_image_key")).toBeTruthy();
    });

    it('indicates when all resources have been loaded', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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
    it('can forget an individual resource key', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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

        const someImageOrError = loader.getResource("some_image_key");
        expect(isError(someImageOrError)).toBeTruthy();

        const errorFound = unwrapResultOrError(someImageOrError);
        expect(errorFound).toEqual(expect.any(Error));
    });
    it('can forget a list of resource keys', () => {
        const loader = new ResourceHandler({
            imageLoader: new stubImmediateLoader(),
            allResources: [
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

        const errors = loader.loadResources(["image1", "image2"]);
        expect(errors).toHaveLength(0);

        loader.deleteResources(["image1"]);

        const someImageOrError = loader.getResource("image1");
        expect(isError(someImageOrError)).toBeTruthy();

        const errorFound = unwrapResultOrError(someImageOrError);
        expect(errorFound).toEqual(expect.any(Error));

        const image2 = loader.getResource("image2");
        expect(isResult(image2)).toBeTruthy();

        const image2Data = unwrapResultOrError(image2);
        expect(image2Data).toBe("stubImage for image2");
    });
});
