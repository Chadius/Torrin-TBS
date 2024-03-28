import {Label, LabelService} from "../../ui/label";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export class DialogueAnswerButton {
    answerText: string;
    buttonRect: RectArea;
    answerLabel: Label;

    constructor({
                    answer,
                    position,
                }: {
        answer?: string;
        position?: RectArea;
    }) {
        this.answerText = answer;
        this.buttonRect = position;

        this.createUIObjects();
    }

    draw(graphicsContext: GraphicsContext) {
        LabelService.draw(this.answerLabel, graphicsContext);
    }

    buttonWasClicked(mouseX: number, mouseY: number): boolean {
        return (
            mouseX >= this.buttonRect.left
            && mouseX <= this.buttonRect.left + this.buttonRect.width
            && mouseY >= this.buttonRect.top
            && mouseY <= this.buttonRect.top + this.buttonRect.height
        );
    }

    private createUIObjects() {
        const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
        const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];

        this.answerLabel = LabelService.new({
            padding: [this.buttonRect.height * 0.1, this.buttonRect.width * 0.1],
            area: RectAreaService.new({
                left: this.buttonRect.left,
                top: this.buttonRect.top,
                width: this.buttonRect.width,
                height: this.buttonRect.height,
            }),
            fillColor: dialogueBoxBackgroundColor,
            text: this.answerText,
            textSize: 24,
            fontColor: dialogueBoxTextColor,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER
        })
    }
}
