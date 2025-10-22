import { RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialoguePosition,
    TDialoguePosition,
} from "./constants"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { ResourceHandler } from "../../resource/resourceHandler"
import { WINDOW_SPACING } from "../../ui/constants.ts"

export interface DialoguePortraitImage {
    speakerPortrait: p5.Image | undefined
    speakerImage: ImageUI | undefined
    position: TDialoguePosition
}

export const DialoguePortraitImageService = {
    new: ({
        speakerPortrait,
        position,
    }: Partial<DialoguePortraitImage>): DialoguePortraitImage => {
        const uiObjects = createUIObjects({
            speakerPortrait,
            position: position ?? DialoguePosition.CENTER,
        })
        return {
            speakerImage: uiObjects?.speakerImage,
            speakerPortrait,
            position: position ?? DialoguePosition.CENTER,
        }
    },
    draw: ({
        portraitImage,
        graphics,
        resourceHandler,
    }: {
        portraitImage: DialoguePortraitImage
        graphics: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void => {
        portraitImage?.speakerImage?.draw({
            graphicsContext: graphics,
            resourceHandler,
        })
    },
}

const createUIObjects = ({
    speakerPortrait,
    position,
}: {
    speakerPortrait: p5.Image | undefined
    position: TDialoguePosition
}) => {
    if (speakerPortrait == undefined) return
    const rectStyle = DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[position]
    if (rectStyle.horizontalMargin == undefined) return
    if (rectStyle.bottomFraction == undefined) return
    if (rectStyle.bottomOffset == undefined) return

    let speakerBoxLeft: number = {
        [DialoguePosition.LEFT]: WINDOW_SPACING.SPACING2,
        [DialoguePosition.CENTER]:
            (ScreenDimensions.SCREEN_WIDTH -
                speakerPortrait.width -
                WINDOW_SPACING.SPACING2) /
            2,
        [DialoguePosition.RIGHT]:
            ScreenDimensions.SCREEN_WIDTH -
            speakerPortrait.width -
            WINDOW_SPACING.SPACING2,
    }[position]

    if (speakerBoxLeft < 0) {
        speakerBoxLeft = 0
    } else if (
        speakerBoxLeft + speakerPortrait.width >
        ScreenDimensions.SCREEN_WIDTH
    ) {
        speakerBoxLeft = ScreenDimensions.SCREEN_WIDTH - speakerPortrait.width
    }

    const speakerBoxBottom =
        ScreenDimensions.SCREEN_HEIGHT * rectStyle.bottomFraction -
        rectStyle.bottomOffset

    const speakerImage = new ImageUI({
        imageLoadingBehavior: {
            loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            resourceKey: undefined,
        },
        graphic: speakerPortrait,
        area: RectAreaService.new({
            left: speakerBoxLeft,
            top: speakerBoxBottom - speakerPortrait.height,
            width: speakerPortrait.width,
            height: speakerPortrait.height,
        }),
    })

    return { speakerImage }
}
