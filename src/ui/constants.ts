import { EnumLike } from "../utils/enum"

export const WINDOW_SPACING = {
    SPACING1: 8,
    SPACING2: 16,
    SPACING4: 32,
} as const satisfies Record<string, number>

export const HORIZONTAL_ALIGN = {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
} as const satisfies Record<string, string>
export type HORIZONTAL_ALIGN_TYPE = EnumLike<typeof HORIZONTAL_ALIGN>

export const VERTICAL_ALIGN = {
    TOP: "top",
    BASELINE: "alphabetic",
    CENTER: "center",
} as const satisfies Record<string, string>
export type VERTICAL_ALIGN_TYPE = EnumLike<typeof VERTICAL_ALIGN>

export const GOLDEN_RATIO = (1.0 + Math.sqrt(5)) / 2.0
