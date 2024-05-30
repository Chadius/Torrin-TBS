import { BattleOrchestratorState } from "../battle/orchestrator/battleOrchestratorState"
import { TextSubstitution } from "./textSubstitution"

export type BattleOrchestratorStateSubstitution = TextSubstitution & {
    substitute: (state: BattleOrchestratorState) => string
}

const substitutions: BattleOrchestratorStateSubstitution[] = [
    {
        name: "Turn count",
        token: "$$TURN_COUNT",
        description: "Gets the turn count of the current battle.",
        substitute: (state: BattleOrchestratorState) =>
            state.battleState.battlePhaseState
                ? `${state.battleState.battlePhaseState.turnCount}`
                : "MISSING BATTLE PHASE",
    },
    {
        name: "Time elapsed (Milliseconds)",
        token: "$$TIME_ELAPSED_IN_MILLISECONDS",
        description: "The amount of time spent in combat.",
        substitute: (state: BattleOrchestratorState) =>
            state.battleState.missionStatistics
                ? `${state.battleState.missionStatistics.timeElapsedInMilliseconds}`
                : "MISSING MISSION STATISTICS",
    },
    {
        name: "Time elapsed (HH:MM:SS.mmm)",
        token: "$$TIME_ELAPSED",
        description:
            "The amount of time spent in a mission. Written with hours, minutes, seconds and milliseconds",
        substitute: (state: BattleOrchestratorState) => {
            if (!state.battleState.missionStatistics) {
                return "MISSING MISSION STATISTICS"
            }

            const milliseconds =
                state.battleState.missionStatistics.timeElapsedInMilliseconds %
                1000
            const totalSeconds = Math.floor(
                state.battleState.missionStatistics.timeElapsedInMilliseconds /
                    1000
            )

            const seconds = totalSeconds % 60
            const minutes = Math.floor(totalSeconds / 60) % 60
            const hours = Math.floor(totalSeconds / 60 / 60)

            const millisecondsPad = String(milliseconds).padStart(3, "0")
            const secondsPad = String(seconds).padStart(2, "0")
            const minutesPad = String(minutes).padStart(2, "0")
            const hoursPad = String(hours).padStart(2, "0")

            return `${hoursPad}:${minutesPad}:${secondsPad}.${millisecondsPad}`
        },
    },
    {
        name: "Damage dealt by player team",
        token: "$$DAMAGE_DEALT_BY_PLAYER_TEAM",
        description: "The amount of damage player squaddies dealt.",
        substitute: (state: BattleOrchestratorState) =>
            state.battleState.missionStatistics
                ? `${state.battleState.missionStatistics.damageDealtByPlayerTeam}`
                : "MISSING MISSION STATISTICS",
    },
    {
        name: "Damage received by player team",
        token: "$$DAMAGE_TAKEN_BY_PLAYER_TEAM",
        description: "The amount of damage player squaddies took.",
        substitute: (state: BattleOrchestratorState) =>
            state.battleState.missionStatistics
                ? `${state.battleState.missionStatistics.damageTakenByPlayerTeam}`
                : "MISSING MISSION STATISTICS",
    },
    {
        name: "Healing received by player team",
        token: "$$HEALING_RECEIVED_BY_PLAYER_TEAM",
        description: "The amount of healing player squaddies received.",
        substitute: (state: BattleOrchestratorState) =>
            state.battleState.missionStatistics
                ? `${state.battleState.missionStatistics.healingReceivedByPlayerTeam}`
                : "MISSING MISSION STATISTICS",
    },
]

export const SubstituteTextUsingBattleOrchestraState = (
    input: string,
    battleState: BattleOrchestratorState
) => {
    let substitutedInput = input + ""
    let lookForASubstitution = true
    while (lookForASubstitution) {
        lookForASubstitution = substitutions.some((sub) =>
            substitutedInput.includes(sub.token)
        )

        substitutions.forEach((sub) => {
            if (substitutedInput.includes(sub.token)) {
                substitutedInput = substitutedInput.replace(
                    sub.token,
                    sub.substitute(battleState)
                )
            }
        })
    }

    return substitutedInput
}
