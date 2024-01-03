import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {ActionEffect} from "../../squaddie/actionEffect";

export interface BattleEvent {
    instruction: SquaddieInstructionInProgress;
    results: SquaddieSquaddieResults;
}

export const BattleEventHandler = {
    actions: (data: BattleEvent): ActionEffect[] => {
        return [...data.instruction.squaddieActionsForThisRound.actions];
    },
    clone: (original: BattleEvent): BattleEvent => {
        return {
            instruction: {...original.instruction},
            results: {...original.results},
        };
    }
}

