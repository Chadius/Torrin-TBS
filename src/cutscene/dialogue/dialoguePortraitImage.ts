import { RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialoguePosition,
    TDialoguePosition,
    DialogueTextService,
} from "./constants"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { ResourceHandler } from "../../resource/resourceHandler"

export class DialoguePortraitImage {
    speakerPortrait: p5.Image | undefined
    speakerImage: ImageUI | undefined
    position: TDialoguePosition

    constructor({
        speakerPortrait,
        position,
    }: {
        speakerPortrait?: p5.Image
        position?: TDialoguePosition
    }) {
        this.speakerPortrait = speakerPortrait
        this.position = position || DialoguePosition.CENTER
        this.createUIObjects()
    }

    draw(graphicsContext: GraphicsBuffer, resourceHandler: ResourceHandler) {
        this.speakerImage?.draw({ graphicsContext, resourceHandler })
    }

    private createUIObjects() {
        if (this.speakerPortrait == undefined) return
        const rectStyle =
            DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[this.position]
        if (rectStyle.horizontalMargin == undefined) return
        if (rectStyle.bottomFraction == undefined) return
        if (rectStyle.bottomOffset == undefined) return

        let speakerBoxWidth = 0
        if (rectStyle.maxWidth) {
            speakerBoxWidth =
                Math.min(ScreenDimensions.SCREEN_WIDTH, rectStyle.maxWidth) -
                rectStyle.horizontalMargin * 2
        } else {
            if (rectStyle.widthFraction == undefined) return
            speakerBoxWidth =
                ScreenDimensions.SCREEN_WIDTH * rectStyle.widthFraction
        }

        let speakerBoxLeft: number = DialogueTextService.calculateLeftAlignSide(
            {
                rectStyle,
                dialogueBoxWidth: speakerBoxWidth,
                horizontalMargin: rectStyle.horizontalMargin,
            }
        )

        if (speakerBoxLeft < 0) {
            speakerBoxLeft = 0
        } else if (
            speakerBoxLeft + this.speakerPortrait.width >
            ScreenDimensions.SCREEN_WIDTH
        ) {
            speakerBoxLeft =
                ScreenDimensions.SCREEN_WIDTH - this.speakerPortrait.width
        }

        const speakerBoxBottom =
            ScreenDimensions.SCREEN_HEIGHT * rectStyle.bottomFraction -
            rectStyle.bottomOffset

        this.speakerImage = new ImageUI({
            imageLoadingBehavior: {
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                resourceKey: undefined,
            },
            graphic: this.speakerPortrait,
            area: RectAreaService.new({
                left: speakerBoxLeft,
                top: speakerBoxBottom - this.speakerPortrait.height,
                width: this.speakerPortrait.width,
                height: this.speakerPortrait.height,
            }),
        })
    }
}
