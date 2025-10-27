import { Label, LabelService } from "../../ui/label"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
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
import { TextGraphicalHandlingService } from "../../utils/graphics/textGraphicalHandlingService"
import { HORIZONTAL_ALIGN, WINDOW_SPACING } from "../../ui/constants"

export const DIALOGUE_TEXT_BOX_STYLE_CONSTANTS: {
    [t in TDialoguePosition]: DialogTextBoxLayout
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.CENTER,
        topFraction: 0.7,
        possibleContainerWidths: [0.25, 0.33, 0.5, 0.7],
        maximumLinesOfText: 3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
    [DialoguePosition.LEFT]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topFraction: 0.7,
        possibleContainerWidths: [0.25, 0.33, 0.5, 0.7, 0.9],
        maximumLinesOfText: 3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
    [DialoguePosition.RIGHT]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.RIGHT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.RIGHT,
        topFraction: 0.7,
        possibleContainerWidths: [0.25, 0.33, 0.5],
        maximumLinesOfText: 3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
}

export interface DialogTextBoxLayout extends ThirdOfScreenAlignment {
    fillColor: number[]
    horizontalMargin: number
    topOffset: number
    topFraction: number
    possibleContainerWidths: number[]
    textBoxMargin: [number, number, number, number]
    maximumLinesOfText?: number
}

const DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS: {
    [t in TDialoguePosition]: DialogTextBoxLayout
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        possibleContainerWidths: [0.3],
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
        possibleContainerWidths: [0.3],
        maximumLinesOfText: 3,
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
        possibleContainerWidths: [0.3],
        maximumLinesOfText: 3,
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
        let textFitMitigations = [
            rectStyle.possibleContainerWidths.length > 1
                ? {
                      possibleContainerWidths:
                          rectStyle.possibleContainerWidths.map(
                              (ratio) => ScreenDimensions.SCREEN_WIDTH * ratio
                          ),
                  }
                : undefined,
            rectStyle.maximumLinesOfText
                ? { maximumNumberOfLines: rectStyle.maximumLinesOfText }
                : undefined,
        ].filter((x) => x != undefined)

        const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
            text: this.dialogueText,
            graphics: graphicsContext,
            currentContainerWidth:
                ScreenDimensions.SCREEN_WIDTH *
                rectStyle.possibleContainerWidths[0],
            fontDescription: {
                strokeWeight: fontStyle.strokeWeight,
                preferredFontSize: fontStyle.fontSizeRange.preferred,
            },
            mitigations: textFitMitigations,
        })

        let dialogueTextLabelLeft: number =
            DialoguePlacementService.getRelativePlacementLeftSide({
                relativePlacementArea: this.relativePlacementArea,
                position: this.position,
                objectWidth: textFit.maximumWidthOfText,
            })

        const labelTextWidth =
            {
                [DialogueComponent.DIALOGUE_BOX]: textFit.containerWidth,
                [DialogueComponent.SPEAKER_NAME]: textFit.maximumWidthOfText,
            }[dialogueComponent] ?? ScreenDimensions.SCREEN_WIDTH

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
                    labelTextWidth +
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
