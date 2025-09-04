export const GameModeEnum = {
    UNKNOWN: "UNKNOWN",
    TITLE_SCREEN: "TITLE_SCREEN",
    BATTLE: "BATTLE",
    LOADING_BATTLE: "LOADING_BATTLE",
} as const satisfies Record<string, string>

export type TGameMode = EnumLike<typeof GameModeEnum>
