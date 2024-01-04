import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";

export interface BattleEvent {
    instruction: SquaddieInstructionInProgress;
    results: SquaddieSquaddieResults;
}

export const BattleEventService = {
    clone: (original: BattleEvent): BattleEvent => {
        return {
            instruction: {...original.instruction},
            results: {...original.results},
        };
    }
}

