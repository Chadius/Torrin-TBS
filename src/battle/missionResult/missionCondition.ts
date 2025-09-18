import { MissionConditionDefeatAffiliation } from "./missionConditionDefeatAffiliation"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { EnumLike } from "../../utils/enum"

export const MissionConditionType = {
    DEFEAT_ALL_ENEMIES: "DEFEAT_ALL_ENEMIES",
    DEFEAT_ALL_PLAYERS: "DEFEAT_ALL_PLAYERS",
    DEFEAT_ALL_ALLIES: "DEFEAT_ALL_ALLIES",
    DEFEAT_ALL_NO_AFFILIATIONS: "DEFEAT_ALL_NO_AFFILIATIONS",
} as const satisfies Record<string, string>
export type TMissionConditionType = EnumLike<typeof MissionConditionType>

export interface MissionCondition {
    id: string
    type: TMissionConditionType
}

export interface MissionConditionCalculator {
    shouldBeComplete(
        missionCondition: MissionCondition,
        state: GameEngineState,
        missionObjectiveId: string
    ): boolean
}

export const MissionShouldBeComplete = (
    missionCondition: MissionCondition,
    state: GameEngineState,
    missionObjectiveId: string
): boolean => {
    let calculator: MissionConditionCalculator
    if (
        [
            MissionConditionType.DEFEAT_ALL_ENEMIES,
            MissionConditionType.DEFEAT_ALL_PLAYERS,
            MissionConditionType.DEFEAT_ALL_ALLIES,
            MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS,
        ].includes(missionCondition.type)
    ) {
        calculator = new MissionConditionDefeatAffiliation()
    } else return false

    return calculator.shouldBeComplete(
        missionCondition,
        state,
        missionObjectiveId
    )
}
