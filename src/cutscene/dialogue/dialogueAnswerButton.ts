import { Label, LabelService } from "../../ui/label"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { MousePress } from "../../utils/mouseConfig"

export class DialogueAnswerButton {
    answerText: string | undefined
    buttonRect: RectArea | undefined
    answerLabel: Label | undefined

    constructor({
        answer,
        position,
    }: {
        answer?: string
        position?: RectArea
    }) {
        this.answerText = answer
        this.buttonRect = position

        this.createUIObjects()
    }

    draw(graphicsContext: GraphicsBuffer) {
        LabelService.draw(this.answerLabel, graphicsContext)
    }

    buttonWasClicked(mousePress: MousePress): boolean {
        return (
            this.buttonRect != undefined &&
            mousePress.x >= this.buttonRect.left &&
            mousePress.x <= this.buttonRect.left + this.buttonRect.width &&
            mousePress.y >= this.buttonRect.top &&
            mousePress.y <= this.buttonRect.top + this.buttonRect.height
        )
    }

    private createUIObjects() {
        if (this.buttonRect == undefined || this.answerText == undefined) return

        const dialogueBoxBackgroundColor: [number, number, number] = [
            200, 10, 50,
        ]
        const dialogueBoxTextColor: [number, number, number] = [0, 0, 0]
        this.answerLabel = LabelService.new({
            textBoxMargin: [
                this.buttonRect.height * 0.1,
                this.buttonRect.width * 0.1,
            ],
            area: RectAreaService.new({
                left: this.buttonRect.left,
                top: this.buttonRect.top,
                width: this.buttonRect.width,
                height: this.buttonRect.height,
            }),
            fillColor: dialogueBoxBackgroundColor,
            text: this.answerText,
            fontSize: 24,
            fontColor: dialogueBoxTextColor,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }
}
