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
    maxWidth?: number
    widthFraction?: number
    horizontalMargin: number
    topOffset: number
    topFraction: number
    heightFraction?: number
    height?: number
    textBoxMargin: number[]
}

export const DIALOGUE_TEXT_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: StyleTextBoxConstants
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        maxWidth: MAX_WIDTH,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING2,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.CENTER,
        topFraction: 0.7,
        heightFraction: 0.3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING4,
            WINDOW_SPACING.SPACING2,
            0,
            WINDOW_SPACING.SPACING2,
        ],
    },
    [DialoguePosition.LEFT]: {
        fillColor: [200, 10, 50],
        maxWidth: MAX_WIDTH,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING2,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topFraction: 0.7,
        heightFraction: 0.3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING4,
            WINDOW_SPACING.SPACING2,
            0,
            WINDOW_SPACING.SPACING2,
        ],
    },
}

export const DIALOGUE_SPEAKER_NAME_BOX_STYLE_CONSTANTS: {
    [t in DialoguePosition]: StyleTextBoxConstants
} = {
    [DialoguePosition.CENTER]: {
        fillColor: [200, 10, 50],
        widthFraction: 0.3,
        horizontalMargin: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.CENTER,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topOffset: 5 * WINDOW_SPACING.SPACING1,
        topFraction: 0.7,
        height: WINDOW_SPACING.SPACING2 * 3,
        textBoxMargin: [
            WINDOW_SPACING.SPACING1 * 1.3,
            0,
            0,
            WINDOW_SPACING.SPACING1,
        ],
    },
    [DialoguePosition.LEFT]: {
        fillColor: [200, 10, 50],
        widthFraction: 0.3,
        horizontalMargin: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.LEFT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.LEFT,
        topOffset: 5 * WINDOW_SPACING.SPACING1,
        topFraction: 0.7,
        height: WINDOW_SPACING.SPACING2 * 3,
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
}

export const DIALOGUE_FONT_STYLE_CONSTANTS: {
    [t in DialogueFontStyle]: StyleFontConstants
} = {
    [DialogueFontStyle.BLACK]: {
        color: [0, 0, 0],
        textSize: WINDOW_SPACING.SPACING4,
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
