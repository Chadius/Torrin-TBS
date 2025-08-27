import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TextBoxMargin } from "../../ui/label"
import { DialogTextBoxLayout } from "./dialogueTextBox"
import { FontSizeRange } from "../../utils/graphics/textGraphicalHandlingService"

export enum DialoguePosition {
    CENTER = "CENTER",
    LEFT = "LEFT",
}

export enum DialogueComponent {
    DIALOGUE_BOX = "DIALOGUE_BOX",
    SPEAKER_NAME = "SPEAKER_NAME",
}

export const MAX_WIDTH: number = 768

export interface ThirdOfScreenAlignment {
    thirdOfScreenAlignment: HORIZONTAL_ALIGN
    thirdOfScreenSubAlignment: HORIZONTAL_ALIGN
}

export const DIALOGUE_TEXT_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: DialogTextBoxLayout
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.CENTER,
        topFraction: 0.7,
        maxPixelWidth: ScreenDimensions.SCREEN_WIDTH / 3,
        linesOfTextRange: { maximum: 3 },
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
        maxPixelWidth: ScreenDimensions.SCREEN_WIDTH / 3,
        linesOfTextRange: { maximum: 3 },
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
}

export enum DialogueFontStyle {
    BLACK = "BLACK",
    WARNING_POPUP = "WARNING_POPUP",
}

export interface StyleFontConstants {
    fontColor: number[]
    fontSizeRange: FontSizeRange
    horizAlign?: HORIZONTAL_ALIGN
    vertAlign?: VERTICAL_ALIGN
    strokeWeight: number
}

export interface PopupWindowConstants {
    label: {
        fillColor: number[]
    } & TextBoxMargin
    minHeight: number
}

export const WARNING_POPUP_TEXT_CONSTANTS: PopupWindowConstants = {
    label: {
        fillColor: [60, 40, 10],
        textBoxMargin: 8,
    },
    minHeight: 80,
}

export const DIALOGUE_FONT_STYLE_CONSTANTS: {
    [t in DialogueFontStyle]: StyleFontConstants
} = {
    [DialogueFontStyle.BLACK]: {
        fontColor: [0, 0, 0],
        fontSizeRange: {
            preferred: WINDOW_SPACING.SPACING4,
            minimum: WINDOW_SPACING.SPACING2 + WINDOW_SPACING.SPACING1,
        },
        strokeWeight: 4,
    },
    [DialogueFontStyle.WARNING_POPUP]: {
        fontColor: [245, 20, 90],
        fontSizeRange: {
            preferred: WINDOW_SPACING.SPACING2,
            minimum: WINDOW_SPACING.SPACING2,
        },
        strokeWeight: 4,
    },
}

export interface StylePortraitConstants extends ThirdOfScreenAlignment {
    maxWidth?: number
    widthFraction?: number
    horizontalMargin?: number
    bottomOffset?: number
    bottomFraction?: number
}

export const DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS: {
    [t in DialoguePosition]: StylePortraitConstants
} = {
    [DialoguePosition.CENTER]: {
        maxWidth: MAX_WIDTH,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        bottomOffset: 5 * WINDOW_SPACING.SPACING1 + 1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.CENTER,
        bottomFraction: 0.7,
    },
    [DialoguePosition.LEFT]: {
        maxWidth: MAX_WIDTH,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        bottomOffset: 5 * WINDOW_SPACING.SPACING1 + 1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        bottomFraction: 0.7,
    },
}

export const DialogueTextService = {
    calculateLeftAlignSide: ({
        rectStyle,
        dialogueBoxWidth,
        horizontalMargin,
    }: {
        rectStyle: ThirdOfScreenAlignment
        dialogueBoxWidth: number
        horizontalMargin: number
    }) => {
        let dialogueTextLabelLeft: number
        switch (true) {
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.CENTER &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.LEFT:
                dialogueTextLabelLeft =
                    ScreenDimensions.SCREEN_WIDTH / 2 - MAX_WIDTH / 2
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.CENTER &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.RIGHT:
                dialogueTextLabelLeft =
                    ScreenDimensions.SCREEN_WIDTH / 2 +
                    MAX_WIDTH / 2 -
                    dialogueBoxWidth
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.CENTER:
                dialogueTextLabelLeft =
                    (ScreenDimensions.SCREEN_WIDTH - dialogueBoxWidth) / 2
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.LEFT &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.RIGHT:
                dialogueTextLabelLeft =
                    MAX_WIDTH - dialogueBoxWidth - horizontalMargin
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.LEFT &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.CENTER:
                dialogueTextLabelLeft = MAX_WIDTH / 2 - dialogueBoxWidth / 2
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.LEFT:
                dialogueTextLabelLeft = horizontalMargin
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.RIGHT &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.LEFT:
                dialogueTextLabelLeft =
                    ScreenDimensions.SCREEN_WIDTH - MAX_WIDTH + horizontalMargin
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.RIGHT &&
                rectStyle.thirdOfScreenSubAlignment === HORIZONTAL_ALIGN.CENTER:
                dialogueTextLabelLeft =
                    ScreenDimensions.SCREEN_WIDTH -
                    MAX_WIDTH / 2 -
                    dialogueBoxWidth / 2
                break
            case rectStyle.thirdOfScreenAlignment === HORIZONTAL_ALIGN.RIGHT:
                dialogueTextLabelLeft =
                    ScreenDimensions.SCREEN_WIDTH -
                    dialogueBoxWidth -
                    horizontalMargin
                break
            default:
                dialogueTextLabelLeft = 0
                break
        }
        return dialogueTextLabelLeft
    },
}
