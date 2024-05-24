import {Label, LabelService} from "../../ui/label";
import {RectAreaService} from "../../ui/rectArea";
import {WINDOW_SPACING} from "../../ui/constants";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

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

    draw(graphicsContext: GraphicsContext) {
        LabelService.draw(this.speakerTextLabel, graphicsContext);
    }

    private createUIObjects() {
        const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
        const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];
        const dialogueBoxTop = this.screenDimensions[1] * 0.7;
        const dialogueBoxHeight = this.screenDimensions[1] * 0.3;
        const dialogueBoxLeft = WINDOW_SPACING.SPACING2;

        this.speakerTextLabel = LabelService.new({
            textBoxMargin: [WINDOW_SPACING.SPACING4, WINDOW_SPACING.SPACING2, 0, WINDOW_SPACING.SPACING2],
            area: RectAreaService.new({
                left: dialogueBoxLeft,
                top: dialogueBoxTop - WINDOW_SPACING.SPACING2,
                width: this.screenDimensions[0] - WINDOW_SPACING.SPACING4,
                height: dialogueBoxHeight
            }),
            fillColor: dialogueBoxBackgroundColor,
            text: this.speakerText,
            textSize: WINDOW_SPACING.SPACING4,
            fontColor: dialogueBoxTextColor
        });
    }
}
