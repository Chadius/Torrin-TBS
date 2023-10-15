import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {TextSubstitution} from "./textSubstitution";

export type BattleOrchestratorStateSubstitution = TextSubstitution & {
    substitute: (state: BattleOrchestratorState) => string,
}

const substitutions: BattleOrchestratorStateSubstitution[] = [
    {
        name: "TURN_COUNT",
        token: "$$TURN_COUNT",
        description: "Gets the turn count of the current battle.",
        substitute: (state: BattleOrchestratorState) => state.battlePhaseState
            ? `${state.battlePhaseState.turnCount}`
            : "MISSING BATTLE PHASE"
    }
]

export const SubstituteTextUsingBattleOrchestraState = (
    input: string,
    battleState: BattleOrchestratorState
) => {
    let substitutedInput = input + "";
    let lookForASubstitution = true;
    while (lookForASubstitution) {
        lookForASubstitution = substitutions.some((sub) =>
            substitutedInput.includes(sub.token)
        );

        substitutions.forEach((sub) => {
            if (substitutedInput.includes(sub.token)) {
                substitutedInput = substitutedInput.replace(sub.token, sub.substitute(battleState));
            }
        })
    }

    return substitutedInput;
}
