import {SquaddieResource, SquaddieResourceHelper} from "./resource";

describe("resource", () => {
    it('can be sanitized for missing values', () => {
        const resource: SquaddieResource = {
            mapIconResourceKey: "key",
            actionSpritesByEmotion: undefined,
        }

        SquaddieResourceHelper.sanitize(resource);

        expect(resource.actionSpritesByEmotion).toEqual({});
    });
})
