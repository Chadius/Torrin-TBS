import { RectAreaService } from "../../ui/rectArea"
import { ImageUI } from "../../ui/imageUI"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialoguePosition,
    DialogueTextService,
} from "./constants"

export class DialoguePortraitImage {
    speakerPortrait: p5.Image
    speakerImage: ImageUI
    position: DialoguePosition

    constructor({
        speakerPortrait,
        position,
    }: {
        speakerPortrait?: p5.Image
        position?: DialoguePosition
    }) {
        this.speakerPortrait = speakerPortrait
        this.position = position || DialoguePosition.CENTER
        this.createUIObjects()
    }

    draw(graphicsContext: GraphicsBuffer) {
        this.speakerImage.draw(graphicsContext)
    }

    private createUIObjects() {
        const rectStyle =
            DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[this.position]

        const speakerBoxWidth = rectStyle.maxWidth
            ? Math.min(ScreenDimensions.SCREEN_WIDTH, rectStyle.maxWidth) -
              rectStyle.horizontalMargin * 2
            : ScreenDimensions.SCREEN_WIDTH * rectStyle.widthFraction

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