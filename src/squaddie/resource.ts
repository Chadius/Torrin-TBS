import { TSquaddieEmotion } from "../battle/animation/actionAnimation/actionAnimationConstants"
import { isValidValue } from "../utils/objectValidityCheck"

export interface SquaddieResource {
    mapIconResourceKey: string | undefined
    actionSpritesByEmotion: { [key in TSquaddieEmotion]?: string }
}

export const SquaddieResourceService = {
    new: ({
        mapIconResourceKey,
        actionSpritesByEmotion,
    }: {
        mapIconResourceKey?: string
        actionSpritesByEmotion?: { [key in TSquaddieEmotion]?: string }
    }) => {
        return sanitize({
            mapIconResourceKey,
            actionSpritesByEmotion: actionSpritesByEmotion ?? {},
        })
    },
    sanitize: (data: SquaddieResource): SquaddieResource => {
        return sanitize(data)
    },
    getResourceKeys: (resource: SquaddieResource): string[] => {
        let resourceKeys: string[] = []
        if (resource.mapIconResourceKey)
            resourceKeys.push(resource.mapIconResourceKey)
        resourceKeys.push(...Object.values(resource.actionSpritesByEmotion))
        return resourceKeys
    },
}

const sanitize = (data: SquaddieResource) => {
    data.actionSpritesByEmotion = isValidValue(data.actionSpritesByEmotion)
        ? data.actionSpritesByEmotion
        : {}
    return data
}
