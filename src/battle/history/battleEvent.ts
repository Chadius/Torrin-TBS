import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {AnySquaddieActionData} from "./anySquaddieAction";

export interface BattleEvent {
    instruction: SquaddieInstructionInProgress;
    results: SquaddieSquaddieResults;
}

export const BattleEventHandler = {
    actions: (data: BattleEvent): AnySquaddieActionData[] => {
        return [...data.instruction.squaddieActionsForThisRound.actions];
    },
    clone: (original: BattleEvent): BattleEvent => {
        return {
            instruction: {...original.instruction},
            results: {...original.results},
        };
    }
}

