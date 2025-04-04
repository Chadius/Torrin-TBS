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
    StyleFontConstants,
    StyleTextBoxConstants,
} from "./constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TextHandlingService } from "../../utils/graphics/textHandlingService"

export class DialogueTextBox {
    dialogueText: string
    dialogueTextLabel: Label
    position: DialoguePosition
    fontStyle: DialogueFontStyle
    dialogueComponent: DialogueComponent

    constructor({
        text,
        position,
        dialogueComponent,
        fontStyle,
    }: {
        text: string
        position: DialoguePosition
        fontStyle: DialogueFontStyle
        dialogueComponent: DialogueComponent
    }) {
        this.dialogueText = text
        this.position = position || DialoguePosition.CENTER
        this.fontStyle = fontStyle || DialogueFontStyle.BLACK
        this.dialogueComponent = dialogueComponent

        this.createUIObjects(this.dialogueComponent)
    }

    draw(graphicsContext: GraphicsBuffer) {
        LabelService.draw(this.dialogueTextLabel, graphicsContext)
    }

    private createUIObjects(dialogueComponent: DialogueComponent) {
        let rectStyle: StyleTextBoxConstants
        if (dialogueComponent === DialogueComponent.DIALOGUE_BOX) {
            rectStyle = DIALOGUE_TEXT_BOX_STYLE_CONSTANTS[this.position]
        } else if (dialogueComponent === DialogueComponent.SPEAKER_NAME) {
            rectStyle = DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS[this.position]
        }

        const fontStyle = DIALOGUE_FONT_STYLE_CONSTANTS[this.fontStyle]
        const { textToDraw, dialogueBoxWidth } = constrainTextAndGetBoundingBox(
            {
                rectStyle,
                dialogueText: this.dialogueText,
                fontStyle,
            }
        )

        let dialogueBoxHeight: number = 0
        if (dialogueComponent === DialogueComponent.DIALOGUE_BOX) {
            rectStyle = DIALOGUE_TEXT_BOX_STYLE_CONSTANTS[this.position]
            dialogueBoxHeight =
                (textToDraw.length + 1) * fontStyle.fontSize +
                rectStyle.textBoxMargin[0] +
                rectStyle.textBoxMargin[2]
        } else if (dialogueComponent === DialogueComponent.SPEAKER_NAME) {
            rectStyle = DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS[this.position]
            dialogueBoxHeight = fontStyle.fontSize * 1.5
        }

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
                    ScreenDimensions.SCREEN_HEIGHT * rectStyle.topFraction +
                    rectStyle.topOffset,
                width: dialogueBoxWidth,
                height: dialogueBoxHeight,
            }),
            fillColor: rectStyle.fillColor,
            text: textToDraw.join("\n"),
            fontSize: fontStyle.fontSize,
            fontColor: fontStyle.fontColor,
            horizAlign: fontStyle.horizAlign,
            vertAlign: fontStyle.vertAlign,
        })
    }
}

const constrainTextAndGetBoundingBox = ({
    rectStyle,
    dialogueText,
    fontStyle,
}: {
    rectStyle: StyleTextBoxConstants
    dialogueText: string
    fontStyle: StyleFontConstants
}): { textToDraw: string[]; dialogueBoxWidth: number } => {
    const textPerLine: string[] = dialogueText
        .split("\n")
        .reduce((collectedLines: string[], line: string) => {
            collectedLines.push(
                line.slice(0, rectStyle.maxNumberOfCharactersPerLine)
            )
            return collectedLines
        }, [])
    const textToDraw = textPerLine.slice(0, rectStyle.maxNumberLinesOfText)
    const lengthOfLongestLine: number = Math.max(
        ...textToDraw.map((t) =>
            TextHandlingService.approximateLengthOfLineOfText({
                text: t,
                strokeWeight: fontStyle.strokeWeight,
                fontSize: fontStyle.fontSize,
            })
        )
    )

    const dialogueBoxWidth =
        lengthOfLongestLine + rectStyle.horizontalMargin * 2
    return { textToDraw, dialogueBoxWidth }
}
