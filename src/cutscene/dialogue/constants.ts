import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    HORIZONTAL_ALIGN_TYPE,
    VERTICAL_ALIGN_TYPE,
    WINDOW_SPACING,
} from "../../ui/constants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { TextBoxMargin } from "../../ui/label"
import { FontSizeRange } from "../../utils/graphics/textGraphicalHandlingService"
import { EnumLike } from "../../utils/enum"
import { RectArea, RectAreaService } from "../../ui/rectArea.ts"

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

export const DialoguePlacementService = {
    getRelativePlacementLeftSide: ({
        relativePlacementArea,
        position,
        objectWidth,
    }: {
        relativePlacementArea?: RectArea
        position: TDialoguePosition
        objectWidth: number
    }) => {
        let textBoxPlacement = {
            left: relativePlacementArea
                ? RectAreaService.left(relativePlacementArea)
                : 0,
            center: relativePlacementArea
                ? RectAreaService.left(relativePlacementArea) +
                  RectAreaService.width(relativePlacementArea) / GOLDEN_RATIO -
                  objectWidth
                : ScreenDimensions.SCREEN_WIDTH / GOLDEN_RATIO - objectWidth,
            right: relativePlacementArea
                ? RectAreaService.right(relativePlacementArea) - objectWidth
                : ScreenDimensions.SCREEN_WIDTH - objectWidth,
        }

        let dialogueTextLabelLeft: number = {
            [DialoguePosition.LEFT]:
                textBoxPlacement.left + WINDOW_SPACING.SPACING2,
            [DialoguePosition.CENTER]: textBoxPlacement.center,
            [DialoguePosition.RIGHT]: textBoxPlacement.right,
        }[position]

        const paddingIfOffScreen =
            (ScreenDimensions.SCREEN_WIDTH - objectWidth) / 4
        if (dialogueTextLabelLeft < 0) return paddingIfOffScreen
        if (dialogueTextLabelLeft + objectWidth > ScreenDimensions.SCREEN_WIDTH)
            return (
                ScreenDimensions.SCREEN_WIDTH - objectWidth - paddingIfOffScreen
            )

        return dialogueTextLabelLeft
    },
}
