import {TODODELETEMECurrentlySelectedSquaddieDecision} from "./TODODELETEMECurrentlySelectedSquaddieDecision";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {ProcessedAction} from "../../action/processed/processedAction";

export interface BattleEvent {
    instruction: TODODELETEMECurrentlySelectedSquaddieDecision;
    results: SquaddieSquaddieResults;
    processedAction: ProcessedAction;
}

export const BattleEventService = {
    new: ({
              instruction,
              results,
              processedAction,
          }:{
        instruction?: TODODELETEMECurrentlySelectedSquaddieDecision;
        results: SquaddieSquaddieResults;
        processedAction?: ProcessedAction;
    }): BattleEvent => {
        return {
            instruction,
            results,
            processedAction,
        };
    },
    clone: (original: BattleEvent): BattleEvent => {
        return {
            instruction: {...original.instruction},
            results: {...original.results},
            processedAction: {...original.processedAction},
        };
    }
}

