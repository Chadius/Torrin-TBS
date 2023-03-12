import {RectArea} from "../../ui/rectArea";
import {WINDOW_SPACING2} from "../../ui/constants";
import p5 from "p5";
import {ImageUI} from "../../ui/imageUI";

type Options = {
    speakerPortrait: p5.Image;
    screenDimensions: [number, number];
}

export class DialogueSpeakerImage {
    speakerPortrait: p5.Image;
    speakerImage: ImageUI;
    screenDimensions: [number, number]

    constructor(options: Partial<Options>) {
        this.speakerPortrait = options.speakerPortrait;
        this.screenDimensions = options.screenDimensions || [0, 0];

        this.createUIObjects();
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

    draw(p: p5) {
        this.speakerImage.draw(p);
    }
}
