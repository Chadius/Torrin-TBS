import {Label, LabelService} from "../../ui/label";
import {RectAreaService} from "../../ui/rectArea";
import {HORIZONTAL_ALIGN, VERTICAL_ALIGN, WINDOW_SPACING} from "../../ui/constants";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

type Options = {
    name: string;
    screenDimensions: [number, number];
}

export class DialogueSpeakerNameBox {
    speakerName: string;
    speakerNameLabel: Label;
    screenDimensions: [number, number]

    constructor(options: Partial<Options>) {
        this.speakerName = options.name;
        this.screenDimensions = options.screenDimensions || [0, 0];

        this.createUIObjects();
    }

    draw(graphicsContext: GraphicsContext) {
        LabelService.draw(this.speakerNameLabel, graphicsContext);
    }

    private createUIObjects() {
        const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
        const dialogueBoxTop = this.screenDimensions[1] * 0.7;

        const speakerBackgroundColor: [number, number, number] = dialogueBoxBackgroundColor;
        const speakerBoxTop = dialogueBoxTop - (2.5 * WINDOW_SPACING.SPACING2);
        const speakerBoxHeight = WINDOW_SPACING.SPACING2 * 3;
        const speakerBoxLeft = WINDOW_SPACING.SPACING2 * 0.5;

        const speakerBoxTextColor: [number, number, number] = [0, 0, 0];

        this.speakerNameLabel = LabelService.new({
            textBoxMargin: [WINDOW_SPACING.SPACING2, 0, 0, WINDOW_SPACING.SPACING2 * 0.5],
            area: RectAreaService.new({
                left: speakerBoxLeft,
                top: speakerBoxTop,
                width: this.screenDimensions[0] * 0.3,
                height: speakerBoxHeight
            }),
            fillColor: speakerBackgroundColor,
            text: this.speakerName,
            textSize: 24,
            fontColor: speakerBoxTextColor,
            horizAlign: HORIZONTAL_ALIGN.LEFT,
            vertAlign: VERTICAL_ALIGN.BASELINE,
        });
    }
}
