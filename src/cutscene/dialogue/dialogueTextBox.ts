import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS,
    DIALOGUE_TEXT_BOX_STYLE_CONSTANTS,
    DialogueComponent,
    DialogueFontStyle,
    DialoguePosition,
    DialogueTextService,
    StyleTextBoxConstants,
} from "./constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"

export class DialogueTextBox {
    dialogueText: string
    dialogueTextLabel: Label
    position: DialoguePosition
    fontStyle: DialogueFontStyle
    component: DialogueComponent

    constructor({
        text,
        position,
        component,
        fontStyle,
    }: {
        text: string
        position: DialoguePosition
        fontStyle: DialogueFontStyle
        component: DialogueComponent
    }) {
        this.dialogueText = text
        this.position = position || DialoguePosition.CENTER
        this.fontStyle = fontStyle || DialogueFontStyle.BLACK
        this.component = component

        this.createUIObjects(this.component)
    }

    draw(graphicsContext: GraphicsBuffer) {
        LabelService.draw(this.dialogueTextLabel, graphicsContext)
    }

    private createUIObjects(component: DialogueComponent) {
        let rectStyle: StyleTextBoxConstants
        if (component === DialogueComponent.DIALOGUE_BOX) {
            rectStyle = DIALOGUE_TEXT_BOX_STYLE_CONSTANTS[this.position]
        } else if (component === DialogueComponent.SPEAKER_NAME) {
            rectStyle = DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS[this.position]
        }

        const fontStyle = DIALOGUE_FONT_STYLE_CONSTANTS[this.fontStyle]

        const dialogueBoxWidth = rectStyle.maxWidth
            ? Math.min(ScreenDimensions.SCREEN_WIDTH, rectStyle.maxWidth) -
              rectStyle.horizontalMargin * 2
            : ScreenDimensions.SCREEN_WIDTH * rectStyle.widthFraction

        let dialogueTextLabelLeft: number =
            DialogueTextService.calculateLeftAlignSide({
                rectStyle,
                dialogueBoxWidth,
                horizontalMargin: rectStyle.horizontalMargin,
            })

        this.dialogueTextLabel = LabelService.new({
            textBoxMargin: rectStyle.textBoxMargin,
            area: RectAreaService.new({
                left: dialogueTextLabelLeft,
                top:
                    ScreenDimensions.SCREEN_HEIGHT * rectStyle.topFraction -
                    rectStyle.topOffset,
                width: dialogueBoxWidth,
                height: rectStyle.heightFraction
                    ? ScreenDimensions.SCREEN_HEIGHT * rectStyle.heightFraction
                    : rectStyle.height,
            }),
            fillColor: rectStyle.fillColor,
            text: this.dialogueText,
            textSize: fontStyle.textSize,
            fontColor: fontStyle.color,
            horizAlign: fontStyle.horizAlign,
            vertAlign: fontStyle.vertAlign,
        })
    }
}
