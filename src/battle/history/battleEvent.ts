import {TODODELETEMECurrentlySelectedSquaddieDecision} from "./TODODELETEMECurrentlySelectedSquaddieDecision";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {ProcessedAction} from "../../action/processed/processedAction";
import {isValidValue} from "../../utils/validityCheck";

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
        if (!(
            isValidValue(instruction)
            || isValidValue(processedAction)
        )) {
            throw new Error ("BattleEvent needs either instruction or processed action");
        }

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

