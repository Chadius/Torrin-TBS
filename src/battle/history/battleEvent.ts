import {TODODELETEMECurrentlySelectedSquaddieDecision} from "./TODODELETEMECurrentlySelectedSquaddieDecision";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";

export interface BattleEvent {
    instruction: TODODELETEMECurrentlySelectedSquaddieDecision;
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

