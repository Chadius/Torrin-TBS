import {Label} from "../../ui/label";
import {RectArea} from "../../ui/rectArea";
import {WINDOW_SPACING2, WINDOW_SPACING4} from "../../ui/constants";
import p5 from "p5";

type Options = {
    text: string;
    screenDimensions: [number, number];
}

export class DialogueTextBox {
    speakerText: string;
    speakerTextLabel: Label;
    screenDimensions: [number, number]

    constructor(options: Partial<Options>) {
        this.speakerText = options.text;
        this.screenDimensions = options.screenDimensions || [0, 0];

        this.createUIObjects();
    }

    draw(p: p5) {
        this.speakerTextLabel.draw(p);
    }

    private createUIObjects() {
        const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
        const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];
        const dialogueBoxTop = this.screenDimensions[1] * 0.7;
        const dialogueBoxHeight = this.screenDimensions[1] * 0.3;
        const dialogueBoxLeft = WINDOW_SPACING2;

        this.speakerTextLabel = new Label({
            padding: [WINDOW_SPACING4, WINDOW_SPACING2, 0, WINDOW_SPACING2],
            area: new RectArea({
                left: dialogueBoxLeft,
                top: dialogueBoxTop - WINDOW_SPACING2,
                width: this.screenDimensions[0] - WINDOW_SPACING4,
                height: dialogueBoxHeight
            }),
            fillColor: dialogueBoxBackgroundColor,
            text: this.speakerText,
            textSize: WINDOW_SPACING4,
            fontColor: dialogueBoxTextColor
        });
    }
}
