import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {SubstituteTextUsingBattleOrchestraState} from "./BattleOrchestratorStateSubstitution";

export type TextSubstitution = {
    name: string,
    token: string,
    description: string,
}

export type TextSubstitutionContext = {
    battleOrchestratorState?: BattleOrchestratorState,
}

export const SubstituteText = (input: string, context: TextSubstitutionContext) => {
    if (context.battleOrchestratorState) {
        input = SubstituteTextUsingBattleOrchestraState(input, context.battleOrchestratorState);
    }

    return input;
}
