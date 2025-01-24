import { RectAreaService } from "../../../ui/rectArea"
import { SquaddieEmotion } from "./actionAnimationConstants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import p5 from "p5"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"

let defaultImage: ImageUI

export interface SquaddieSprite {
    actionSpritesByEmotion: {
        [key in SquaddieEmotion]?: ImageUI
    }
    actionSpritesResourceKeysByEmotion: {
        [key in SquaddieEmotion]?: string
    }
}

export const SquaddieSpriteService = {
    new: ({
        actionSpritesResourceKeysByEmotion,
    }: {
        actionSpritesResourceKeysByEmotion: {
            [key in SquaddieEmotion]?: string
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
        emotion: SquaddieEmotion
        graphicsContext: GraphicsBuffer
    }): ImageUI => {
        if (emotion in squaddieSprite.actionSpritesByEmotion) {
            return squaddieSprite.actionSpritesByEmotion[emotion]
        }

        if (SquaddieEmotion.NEUTRAL in squaddieSprite.actionSpritesByEmotion) {
            return squaddieSprite.actionSpritesByEmotion[
                SquaddieEmotion.NEUTRAL
            ]
        }

        return getDefaultEmptyImage(graphicsContext)
    },
}

const createActorImagesWithLoadedData = (squaddieSprite: SquaddieSprite) => {
    Object.keys(squaddieSprite.actionSpritesResourceKeysByEmotion)
        .map((emotionStr) => emotionStr as SquaddieEmotion)
        .forEach((emotion) => {
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

export class SquaddieSpriteClassDELETEME {
    private readonly _actionSpritesByEmotion: {
        [key in SquaddieEmotion]?: ImageUI
    }
    private readonly _actionSpritesResourceKeysByEmotion: {
        [key in SquaddieEmotion]?: string
    }

    constructor({
        actionSpritesResourceKeysByEmotion,
    }: {
        actionSpritesResourceKeysByEmotion: {
            [key in SquaddieEmotion]?: string
        }
    }) {
        this._actionSpritesResourceKeysByEmotion =
            actionSpritesResourceKeysByEmotion
        this._actionSpritesByEmotion = {}
        this.createActorImagesWithLoadedData()
    }

    get actionSpritesByEmotion(): { [key in SquaddieEmotion]?: ImageUI } {
        return this._actionSpritesByEmotion
    }

    get actionSpritesResourceKeysByEmotion(): {
        [key in SquaddieEmotion]?: string
    } {
        return this._actionSpritesResourceKeysByEmotion
    }

    public createActorImagesWithLoadedData(): void {
        Object.keys(this.actionSpritesResourceKeysByEmotion)
            .map((emotionStr) => emotionStr as SquaddieEmotion)
            .forEach((emotion) => {
                this.actionSpritesByEmotion[emotion] = new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            this.actionSpritesResourceKeysByEmotion[emotion],
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

    public getSpriteBasedOnEmotion(
        emotion: SquaddieEmotion,
        graphicsContext: GraphicsBuffer
    ): ImageUI {
        if (emotion in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[emotion]
        }

        if (SquaddieEmotion.NEUTRAL in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[SquaddieEmotion.NEUTRAL]
        }

        return this.defaultEmptyImage(graphicsContext)
    }

    private defaultEmptyImage(graphicsContext: GraphicsBuffer): ImageUI {
        if (defaultImage) {
            return defaultImage
        }

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
}
