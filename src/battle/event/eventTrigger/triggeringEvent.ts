import { EnumLike } from "../../../utils/enum"

export const TriggeringEvent = {
    MISSION_VICTORY: "MISSION_VICTORY",
    MISSION_DEFEAT: "MISSION_DEFEAT",
    START_OF_TURN: "START_OF_TURN",
    SQUADDIE_IS_INJURED: "SQUADDIE_IS_INJURED",
    SQUADDIE_IS_DEFEATED: "SQUADDIE_IS_DEFEATED",
} as const satisfies Record<string, string>
export type TTriggeringEvent = EnumLike<typeof TriggeringEvent>
