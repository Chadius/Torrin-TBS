import {CurrentlySelectedSquaddieDecision} from "./currentlySelectedSquaddieDecision";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";

export interface BattleEvent {
    instruction: CurrentlySelectedSquaddieDecision;
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

