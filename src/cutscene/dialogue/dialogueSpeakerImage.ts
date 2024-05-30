import { RectAreaService } from "../../ui/rectArea"
import { WINDOW_SPACING } from "../../ui/constants"
import { ImageUI } from "../../ui/imageUI"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import p5 from "p5"

type Options = {
    speakerPortrait: p5.Image
}

export class DialogueSpeakerImage {
    speakerPortrait: p5.Image
    speakerImage: ImageUI

    constructor({ speakerPortrait }: { speakerPortrait?: p5.Image }) {
        this.speakerPortrait = speakerPortrait
        this.createUIObjects()
    }

    draw(graphicsContext: GraphicsBuffer) {
        this.speakerImage.draw(graphicsContext)
    }

    private createUIObjects() {
        const dialogueBoxTop = ScreenDimensions.SCREEN_HEIGHT * 0.7
        const dialogueBoxLeft = WINDOW_SPACING.SPACING2
        const speakerBoxTop = dialogueBoxTop - 2.5 * WINDOW_SPACING.SPACING2

        this.speakerImage = new ImageUI({
            graphic: this.speakerPortrait,
            area: RectAreaService.new({
                left: dialogueBoxLeft,
                top: speakerBoxTop - this.speakerPortrait.height,
                width: this.speakerPortrait.width,
                height: this.speakerPortrait.height,
            }),
        })
    }
}
