import { SquaddieResource, SquaddieResourceService } from "./resource"
import { SquaddieEmotion } from "../battle/animation/actionAnimation/actionAnimationConstants"
import { describe, expect, it } from "vitest"

describe("resource", () => {
    it("can be sanitized for missing values", () => {
        const resource: SquaddieResource = {
            mapIconResourceKey: "key",
            actionSpritesByEmotion: undefined,
        }

        SquaddieResourceService.sanitize(resource)

        expect(resource.actionSpritesByEmotion).toEqual({})
    })
    it("can return all of its resource keys", () => {
        const resources = SquaddieResourceService.new({
            mapIconResourceKey: "mapIconResourceKey",
            actionSpritesByEmotion: {
                [SquaddieEmotion.NEUTRAL]: "SquaddieEmotion.NEUTRAL",
                [SquaddieEmotion.ASSISTING]: "SquaddieEmotion.ASSISTING",
                [SquaddieEmotion.DEAD]: "SquaddieEmotion.DEAD",
                [SquaddieEmotion.THANKFUL]: "SquaddieEmotion.THANKFUL",
            },
        })

        const resourceKeys = SquaddieResourceService.getResourceKeys(resources)

        expect(resourceKeys).toEqual(
            expect.arrayContaining([
                resources.mapIconResourceKey,
                ...Object.values(resources.actionSpritesByEmotion),
            ])
        )
    })
})
