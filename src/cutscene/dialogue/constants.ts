import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"

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

export interface StyleTextBoxConstants extends ThirdOfScreenAlignment {
    fillColor: number[]
    horizontalMargin: number
    topOffset: number
    topFraction: number
    maxNumberOfCharactersPerLine: number
    maxNumberLinesOfText: number
    textBoxMargin: number[]
}

export const DIALOGUE_TEXT_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: StyleTextBoxConstants
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.CENTER,
        topFraction: 0.7,
        maxNumberOfCharactersPerLine: 30,
        maxNumberLinesOfText: 3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
    [DialoguePosition.LEFT]: {
        fillColor: [200, 10, 50],
        maxNumberOfCharactersPerLine: 30,
        maxNumberLinesOfText: 3,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topFraction: 0.7,
        textBoxMargin: [
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
            WINDOW_SPACING.SPACING2,
        ],
    },
}

export const DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: StyleTextBoxConstants
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        maxNumberOfCharactersPerLine: 15,
        maxNumberLinesOfText: 1,
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
        maxNumberOfCharactersPerLine: 15,
        maxNumberLinesOfText: 1,
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

export enum DialogueFontStyle {
    BLACK = "BLACK",
}

export interface StyleFontConstants {
    color: number[]
    textSize: number
    horizAlign?: HORIZONTAL_ALIGN
    vertAlign?: VERTICAL_ALIGN
    widthRatio: {
        uppercase: number
        number: number
        default: number
    }
}

export const DIALOGUE_FONT_STYLE_CONSTANTS: {
    [t in DialogueFontStyle]: StyleFontConstants
} = {
    [DialogueFontStyle.BLACK]: {
        color: [0, 0, 0],
        textSize: WINDOW_SPACING.SPACING4,
        widthRatio: {
            uppercase: 0.8,
            number: 0.8,
            default: 0.5,
        },
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
