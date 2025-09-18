import { EnumLike } from "../utils/enum"

export const CutsceneActionPlayerType = {
    SPLASH_SCREEN: "SPLASH_SCREEN",
    DIALOGUE: "DIALOGUE",
} as const satisfies Record<string, string>
export type TCutsceneActionPlayerType = EnumLike<
    typeof CutsceneActionPlayerType
>
