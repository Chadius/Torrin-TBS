import { EnumLike } from "../../utils/enum"

export const ButtonStatus = {
    READY: "READY",
    ACTIVE: "ACTIVE",
    DISABLED: "DISABLED",
    HOVER: "HOVER",
    TOGGLE_ON: "TOGGLE_ON",
    TOGGLE_ON_HOVER: "TOGGLE_ON_HOVER",
    TOGGLE_OFF: "TOGGLE_OFF",
    TOGGLE_OFF_HOVER: "TOGGLE_OFF_HOVER",
} as const satisfies Record<string, string>

export type TButtonStatus = EnumLike<typeof ButtonStatus>
