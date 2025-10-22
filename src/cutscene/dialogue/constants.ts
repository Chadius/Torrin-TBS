import {
    HORIZONTAL_ALIGN,
    HORIZONTAL_ALIGN_TYPE,
    VERTICAL_ALIGN_TYPE,
    WINDOW_SPACING,
} from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TextBoxMargin } from "../../ui/label"
import { DialogTextBoxLayout } from "./dialogueTextBox"
import { FontSizeRange } from "../../utils/graphics/textGraphicalHandlingService"
import { EnumLike } from "../../utils/enum"

export const DialoguePosition = {
    CENTER: "CENTER",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
} as const satisfies Record<string, string>

export type TDialoguePosition = EnumLike<typeof DialoguePosition>

export const DialogueComponent = {
    DIALOGUE_BOX: "DIALOGUE_BOX",
    SPEAKER_NAME: "SPEAKER_NAME",
} as const satisfies Record<string, string>

export type TDialogueComponent = EnumLike<typeof DialogueComponent>

export const MAX_WIDTH: number = 768

export interface ThirdOfScreenAlignment {
    thirdOfScreenAlignment: HORIZONTAL_ALIGN_TYPE
    thirdOfScreenSubAlignment: HORIZONTAL_ALIGN_TYPE
}

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
    [DialoguePosition.RIGHT]: {
        fillColor: [200, 10, 50],
        horizontalMargin: WINDOW_SPACING.SPACING2,
        topOffset: WINDOW_SPACING.SPACING1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.RIGHT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.RIGHT,
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

export const DialogueFontStyle = {
    BLACK: "BLACK",
    WARNING_POPUP: "WARNING_POPUP",
} as const satisfies Record<string, string>

export type TDialogueFontStyle = EnumLike<typeof DialogueFontStyle>

export interface StyleFontConstants {
    fontColor: number[]
    fontSizeRange: FontSizeRange
    horizAlign?: HORIZONTAL_ALIGN_TYPE
    vertAlign?: VERTICAL_ALIGN_TYPE
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
    [t in TDialogueFontStyle]: StyleFontConstants
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
    [t in TDialoguePosition]: StylePortraitConstants
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
    [DialoguePosition.RIGHT]: {
        maxWidth: MAX_WIDTH,
        horizontalMargin: WINDOW_SPACING.SPACING2,
        bottomOffset: 5 * WINDOW_SPACING.SPACING1 + 1,
        thirdOfScreenAlignment: HORIZONTAL_ALIGN.RIGHT,
        thirdOfScreenSubAlignment: HORIZONTAL_ALIGN.RIGHT,
        bottomFraction: 0.7,
    },
}
