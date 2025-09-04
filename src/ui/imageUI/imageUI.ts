import { RectArea } from "../rectArea"
import p5 from "p5"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { PulseColor, PulseColorService } from "../../hexMap/pulseColor"

export const ImageUILoadingBehavior = {
    USE_IMAGE_SIZE: "USE_IMAGE_SIZE",
    KEEP_AREA_WIDTH_USE_ASPECT_RATIO: "KEEP_AREA_WIDTH_USE_ASPECT_RATIO",
    KEEP_AREA_HEIGHT_USE_ASPECT_RATIO: "KEEP_AREA_HEIGHT_USE_ASPECT_RATIO",
    KEEP_AREA_RESIZE_IMAGE: "KEEP_AREA_RESIZE_IMAGE",
    USE_CUSTOM_AREA_CALLBACK: "USE_CUSTOM_AREA_CALLBACK",
} as const satisfies Record<string, string>
export type TImageUILoadingBehavior = EnumLike<typeof ImageUILoadingBehavior>

export const ImageUIService = {
    scaleImageWidth: ({
        imageWidth,
        imageHeight,
        desiredHeight,
    }: {
        imageWidth: number
        imageHeight: number
        desiredHeight: number
    }): number => {
        return scaleImageWidth({ imageWidth, imageHeight, desiredHeight })
    },
    scaleImageHeight: ({
        imageWidth,
        imageHeight,
        desiredWidth,
    }: {
        imageWidth: number
        imageHeight: number
        desiredWidth: number
    }): number => {
        return scaleImageHeight({
            imageHeight,
            desiredWidth,
            imageWidth,
        })
    },
}

const scaleImageWidth = ({
    imageWidth,
    imageHeight,
    desiredHeight,
}: {
    imageWidth: number
    imageHeight: number
    desiredHeight: number
}): number => {
    return (imageWidth * desiredHeight) / imageHeight
}

const scaleImageHeight = ({
    imageWidth,
    imageHeight,
    desiredWidth,
}: {
    imageWidth: number
    imageHeight: number
    desiredWidth: number
}): number => {
    return (imageHeight * desiredWidth) / imageWidth
}

export class ImageUI {
    graphic: p5.Image
    drawArea: RectArea
    tintColor: number[]
    pulseColor: PulseColor
    resourceKey: string
    loadingBehavior: TImageUILoadingBehavior
    customAreaCallback?: ({
        imageSize,
        originalArea,
    }: {
        imageSize: { width: number; height: number }
        originalArea: RectArea
    }) => RectArea

    constructor({
        graphic,
        area,
        imageLoadingBehavior,
    }: {
        graphic?: p5.Image
        area: RectArea
        imageLoadingBehavior: {
            resourceKey: string
            loadingBehavior: TImageUILoadingBehavior
            customAreaCallback?: ({
                imageSize,
                originalArea,
            }: {
                imageSize: { width: number; height: number }
                originalArea: RectArea
            }) => RectArea
        }
    }) {
        this.loadingBehavior = imageLoadingBehavior.loadingBehavior
        this.resourceKey = imageLoadingBehavior.resourceKey
        this.customAreaCallback = imageLoadingBehavior.customAreaCallback
        this.graphic = graphic
        this.drawArea = area
        this.tintColor = []
        this.pulseColor = undefined
    }

    draw({
        graphicsContext,
        resourceHandler,
    }: {
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) {
        this.load(resourceHandler)
        if (!this.graphic) return

        graphicsContext.push()
        if (this.tintColor?.length >= 2) {
            graphicsContext.tint(
                this.tintColor[0],
                this.tintColor[1],
                this.tintColor[2],
                this.tintColor.length > 3 ? this.tintColor[3] : 255
            )
        }
        if (this.pulseColor) {
            const blendColor = PulseColorService.pulseColorToColor(
                this.pulseColor
            )
            graphicsContext.tint(
                blendColor[0],
                blendColor[1],
                blendColor[2],
                blendColor[3]
            )
        }
        graphicsContext.image(
            this.graphic,
            this.drawArea.left,
            this.drawArea.top,
            this.drawArea.width,
            this.drawArea.height
        )
        if (this.tintColor) {
            graphicsContext.noTint()
        }
        graphicsContext.pop()
    }

    private resizeDrawAreaBasedOnLoadingBehavior() {
        switch (true) {
            case this.loadingBehavior === ImageUILoadingBehavior.USE_IMAGE_SIZE:
                this.drawArea.width = this.graphic.width
                this.drawArea.height = this.graphic.height
                break
            case this.loadingBehavior ===
                ImageUILoadingBehavior.KEEP_AREA_WIDTH_USE_ASPECT_RATIO:
                this.drawArea.height = scaleImageHeight({
                    imageWidth: this.graphic.width,
                    imageHeight: this.graphic.height,
                    desiredWidth: this.drawArea.width,
                })
                break
            case this.loadingBehavior ===
                ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO:
                this.drawArea.width = scaleImageWidth({
                    imageWidth: this.graphic.width,
                    imageHeight: this.graphic.height,
                    desiredHeight: this.drawArea.height,
                })
                break
            case this.loadingBehavior ===
                ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK &&
                !!this.customAreaCallback:
                this.drawArea = this.customAreaCallback({
                    imageSize: {
                        width: this.graphic.width,
                        height: this.graphic.height,
                    },
                    originalArea: this.drawArea,
                })
                break
            case this.loadingBehavior ===
                ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK:
                console.warn(
                    `[ImageUI.draw] no custom callback provided for "${this.resourceKey}"`
                )
                break
        }
    }

    setTint(
        hue: number,
        saturation: number,
        brightness: number,
        alpha: number = 255
    ) {
        this.tintColor = [hue, saturation, brightness, alpha]
    }

    removeTint() {
        this.tintColor = []
    }

    load(resourceHandler: ResourceHandler) {
        if (this.graphic) return
        if (resourceHandler.isResourceLoaded(this.resourceKey)) {
            this.graphic = resourceHandler.getResource(this.resourceKey)
            this.resizeDrawAreaBasedOnLoadingBehavior()
            return
        }

        resourceHandler.loadResource(this.resourceKey)
    }

    isImageLoaded(): boolean {
        return !!this.graphic
    }

    setPulseColor(pulseColor: PulseColor) {
        this.pulseColor = pulseColor
    }

    removePulseColor() {
        this.pulseColor = undefined
    }
}
