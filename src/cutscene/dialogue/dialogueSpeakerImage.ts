import {RectArea} from "../../ui/rectArea";
import {WINDOW_SPACING2} from "../../ui/constants";
import {ImageUI} from "../../ui/imageUI";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";

type Options = {
    speakerPortrait: GraphicImage;
    screenDimensions: [number, number];
}

export class DialogueSpeakerImage {
    speakerPortrait: GraphicImage;
    speakerImage: ImageUI;
    screenDimensions: [number, number]

    constructor(options: Partial<Options>) {
        this.speakerPortrait = options.speakerPortrait;
        this.screenDimensions = options.screenDimensions || [0, 0];

        this.createUIObjects();
    }

    draw(graphicsContext: GraphicsContext) {
        this.speakerImage.draw(graphicsContext);
    }

    private createUIObjects() {
        const dialogueBoxTop = this.screenDimensions[1] * 0.7;
        const dialogueBoxLeft = WINDOW_SPACING2
        const speakerBoxTop = dialogueBoxTop - (2.5 * WINDOW_SPACING2);

        this.speakerImage = new ImageUI({
            graphic: this.speakerPortrait,
            area: new RectArea({
                left: dialogueBoxLeft,
                top: speakerBoxTop - this.speakerPortrait.height,
                width: this.speakerPortrait.width,
                height: this.speakerPortrait.height,
            })
        })
    }
}
