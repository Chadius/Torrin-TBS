import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    DIALOGUE_TEXT_BOX_STYLE_CONSTANTS,
    DialogueComponent,
    DialogueFontStyle,
    DialoguePosition,
    DialogueTextService,
    ThirdOfScreenAlignment,
} from "./constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    LinesOfTextRange,
    TextHandlingService,
} from "../../utils/graphics/textHandlingService"
import { HORIZONTAL_ALIGN, WINDOW_SPACING } from "../../ui/constants"

export interface DialogTextBoxLayout extends ThirdOfScreenAlignment {
    fillColor: number[]
    horizontalMargin: number
    topOffset: number
    topFraction: number
    maxPixelWidth: number
    textBoxMargin: [number, number, number, number]
    linesOfTextRange: LinesOfTextRange
}

const DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: DialogTextBoxLayout
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        maxPixelWidth: ScreenDimensions.SCREEN_WIDTH / 3,
        linesOfTextRange: { maximum: 1 },
        horizontalMargin: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topOffset: -5 * WINDOW_SPACING.SPACING1,
        topFraction: 0.7,
        textBoxMargin: [
            WINDOW_SPACING.SPACING1 * 1.3,
            0,
            0,
            WINDOW_SPACING.SPACING1,
        ],
    },
    [DialoguePosition.LEFT]: {
        fillColor: [200, 10, 50],
        maxPixelWidth: ScreenDimensions.SCREEN_WIDTH / 3,
        linesOfTextRange: { maximum: 3 },
        horizontalMargin: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topOffset: -5 * WINDOW_SPACING.SPACING1,
        topFraction: 0.7,
        textBoxMargin: [
            WINDOW_SPACING.SPACING1 * 1.3,
            0,
            0,
            WINDOW_SPACING.SPACING1,
        ],
    },
}

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
    }

    draw(graphicsContext: GraphicsBuffer) {
        if (!this.dialogueTextLabel) {
            this.createUIObjects(this.dialogueComponent, graphicsContext)
        }
        if (this.dialogueTextLabel) {
            LabelService.draw(this.dialogueTextLabel, graphicsContext)
        }
    }

    private createUIObjects(
        dialogueComponent: DialogueComponent,
        graphicsContext: GraphicsBuffer
    ) {
        let rectStyle: DialogTextBoxLayout
        if (dialogueComponent === DialogueComponent.DIALOGUE_BOX) {
            rectStyle = DIALOGUE_TEXT_BOX_STYLE_CONSTANTS[this.position]
        } else if (dialogueComponent === DialogueComponent.SPEAKER_NAME) {
            rectStyle = DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS[this.position]
        }

        const fontStyle = DIALOGUE_FONT_STYLE_CONSTANTS[this.fontStyle]
        const textFit = TextHandlingService.fitTextWithinSpace({
            text: this.dialogueText,
            graphicsContext,
            maximumWidth: rectStyle.maxPixelWidth,
            font: {
                strokeWeight: fontStyle.strokeWeight,
                fontSizeRange: fontStyle.fontSizeRange,
            },
            linesOfTextRange: rectStyle.linesOfTextRange,
        })

        let dialogueTextLabelLeft: number =
            DialogueTextService.calculateLeftAlignSide({
                rectStyle,
                dialogueBoxWidth: textFit.width,
                horizontalMargin: rectStyle.horizontalMargin,
            })

        this.dialogueTextLabel = LabelService.new({
            text: textFit.text,
            fillColor: rectStyle.fillColor,
            fontSize: textFit.fontSize,
            textBoxMargin: rectStyle.textBoxMargin,
            area: RectAreaService.new({
                top:
                    ScreenDimensions.SCREEN_HEIGHT * rectStyle.topFraction +
                    rectStyle.topOffset,
                width:
                    textFit.width +
                    rectStyle.textBoxMargin[1] +
                    rectStyle.textBoxMargin[3],
                left: dialogueTextLabelLeft,
                height:
                    TextHandlingService.calculateMaximumHeightOfFont({
                        fontSize: textFit.fontSize,
                        graphicsContext,
                    }) * textFit.text.split("\n").length,
            }),
            fontColor: fontStyle.fontColor,
            horizAlign: fontStyle.horizAlign,
            vertAlign: fontStyle.vertAlign,
        })
    }
}
