import { Label, LabelService } from "../../ui/label"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    DIALOGUE_TEXT_BOX_STYLE_CONSTANTS,
    DialogueComponent,
    DialogueFontStyle,
    DialoguePlacementService,
    DialoguePosition,
    TDialogueComponent,
    TDialogueFontStyle,
    TDialoguePosition,
    ThirdOfScreenAlignment,
} from "./constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    LinesOfTextRange,
    TextGraphicalHandlingService,
} from "../../utils/graphics/textGraphicalHandlingService"
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
    [t in TDialoguePosition]: DialogTextBoxLayout
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
    [DialoguePosition.RIGHT]: {
        fillColor: [200, 10, 50],
        maxPixelWidth: ScreenDimensions.SCREEN_WIDTH / 3,
        linesOfTextRange: { maximum: 3 },
        horizontalMargin: WINDOW_SPACING.SPACING2,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.RIGHT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.RIGHT,
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
    dialogueTextLabel: Label | undefined
    position: TDialoguePosition
    fontStyle: TDialogueFontStyle
    dialogueComponent: TDialogueComponent
    relativePlacementArea?: RectArea

    constructor({
        text,
        position,
        relativePlacementArea,
        dialogueComponent,
        fontStyle,
    }: {
        text: string
        relativePlacementArea?: RectArea
        position: TDialoguePosition
        fontStyle: TDialogueFontStyle
        dialogueComponent: TDialogueComponent
    }) {
        this.dialogueText = text
        this.position = position || DialoguePosition.CENTER
        this.relativePlacementArea = relativePlacementArea
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
        dialogueComponent: TDialogueComponent,
        graphicsContext: GraphicsBuffer
    ) {
        let rectStyle: DialogTextBoxLayout | undefined = undefined
        if (dialogueComponent === DialogueComponent.DIALOGUE_BOX) {
            rectStyle = DIALOGUE_TEXT_BOX_STYLE_CONSTANTS[this.position]
        } else if (dialogueComponent === DialogueComponent.SPEAKER_NAME) {
            rectStyle = DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS[this.position]
        }
        if (rectStyle == undefined) return

        const fontStyle = DIALOGUE_FONT_STYLE_CONSTANTS[this.fontStyle]
        const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
            text: this.dialogueText,
            graphicsContext,
            maximumWidth: rectStyle.maxPixelWidth,
            fontDescription: {
                strokeWeight: fontStyle.strokeWeight,
                fontSizeRange: fontStyle.fontSizeRange,
            },
            linesOfTextRange: rectStyle.linesOfTextRange,
        })

        let dialogueTextLabelLeft: number =
            DialoguePlacementService.getRelativePlacementLeftSide({
                relativePlacementArea: this.relativePlacementArea,
                position: this.position,
                objectWidth: textFit.width,
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
                    TextGraphicalHandlingService.calculateMaximumHeightOfFont({
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
