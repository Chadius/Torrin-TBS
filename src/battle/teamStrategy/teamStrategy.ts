import { TSquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { EnumLike } from "../../utils/enum"

export const TeamStrategyType = {
    END_TURN: "END_TURN",
    MOVE_CLOSER_TO_SQUADDIE: "MOVE_CLOSER_TO_SQUADDIE",
    TARGET_SQUADDIE_IN_RANGE: "TARGET_SQUADDIE_IN_RANGE",
} as const satisfies Record<string, string>
export type TTeamStrategyType = EnumLike<typeof TeamStrategyType>

export interface TeamStrategyOptions {
    desiredBattleSquaddieId?: string
    desiredAffiliation?: TSquaddieAffiliation
}

export interface TeamStrategy {
    type: TTeamStrategyType
    options: TeamStrategyOptions
}
