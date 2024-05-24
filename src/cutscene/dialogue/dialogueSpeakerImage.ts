import {RectAreaService} from "../../ui/rectArea";
import {WINDOW_SPACING} from "../../ui/constants";
import {ImageUI} from "../../ui/imageUI";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";

type Options = {
    speakerPortrait: GraphicImage;
}

export class DialogueSpeakerImage {
    speakerPortrait: GraphicImage;
    speakerImage: ImageUI;

    constructor({
                    speakerPortrait,
                }: {
        speakerPortrait?: GraphicImage;
    }) {
        this.speakerPortrait = speakerPortrait;
        this.createUIObjects();
    }

    draw(graphicsContext: GraphicsContext) {
        this.speakerImage.draw(graphicsContext);
    }

    private createUIObjects() {
        const dialogueBoxTop = ScreenDimensions.SCREEN_HEIGHT * 0.7;
        const dialogueBoxLeft = WINDOW_SPACING.SPACING2
        const speakerBoxTop = dialogueBoxTop - (2.5 * WINDOW_SPACING.SPACING2);

        this.speakerImage = new ImageUI({
            graphic: this.speakerPortrait,
            area: RectAreaService.new({
                left: dialogueBoxLeft,
                top: speakerBoxTop - this.speakerPortrait.height,
                width: this.speakerPortrait.width,
                height: this.speakerPortrait.height,
            })
        })
    }
}
