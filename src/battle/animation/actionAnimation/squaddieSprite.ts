import { RectAreaService } from "../../../ui/rectArea"
import { SquaddieEmotion, TSquaddieEmotion } from "./actionAnimationConstants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import p5 from "p5"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"

let defaultImage: ImageUI

export interface SquaddieSprite {
    actionSpritesByEmotion: {
        [key in TSquaddieEmotion]?: ImageUI
    }
    actionSpritesResourceKeysByEmotion: {
        [key in TSquaddieEmotion]?: string
    }
}

export const SquaddieSpriteService = {
    new: ({
        actionSpritesResourceKeysByEmotion,
    }: {
        actionSpritesResourceKeysByEmotion: {
            [key in TSquaddieEmotion]?: string
        }
    }) => {
        const squaddieSprite = {
            actionSpritesResourceKeysByEmotion,
            actionSpritesByEmotion: {},
        }
        createActorImagesWithLoadedData(squaddieSprite)
        return squaddieSprite
    },
    getSpriteBasedOnEmotion: ({
        squaddieSprite,
        emotion,
        graphicsContext,
    }: {
        squaddieSprite: SquaddieSprite
        emotion: TSquaddieEmotion
        graphicsContext: GraphicsBuffer
    }): ImageUI => {
        if (emotion in squaddieSprite.actionSpritesByEmotion) {
            return (
                squaddieSprite.actionSpritesByEmotion[emotion] ??
                getDefaultEmptyImage(graphicsContext)
            )
        }

        if (SquaddieEmotion.NEUTRAL in squaddieSprite.actionSpritesByEmotion) {
            return (
                squaddieSprite.actionSpritesByEmotion[
                    SquaddieEmotion.NEUTRAL
                ] ?? getDefaultEmptyImage(graphicsContext)
            )
        }

        return getDefaultEmptyImage(graphicsContext)
    },
}

const createActorImagesWithLoadedData = (squaddieSprite: SquaddieSprite) => {
    Object.keys(squaddieSprite.actionSpritesResourceKeysByEmotion)
        .map((emotionStr) => emotionStr as TSquaddieEmotion)
        .forEach((emotion) => {
            if (
                squaddieSprite.actionSpritesResourceKeysByEmotion[emotion] ==
                undefined
            )
                return

            squaddieSprite.actionSpritesByEmotion[emotion] = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey:
                        squaddieSprite.actionSpritesResourceKeysByEmotion[
                            emotion
                        ],
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                area: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
            })
        })
}

const getDefaultEmptyImage = (graphicsContext: GraphicsBuffer): ImageUI => {
    const emptyImage: p5.Image = graphicsContext.createImage(1, 1)
    emptyImage.loadPixels()

    defaultImage = new ImageUI({
        area: RectAreaService.new({
            left: 0,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
            width: emptyImage.width,
            height: emptyImage.height,
        }),
        graphic: emptyImage,
        imageLoadingBehavior: {
            loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
            resourceKey: undefined,
        },
    })

    return defaultImage
}
