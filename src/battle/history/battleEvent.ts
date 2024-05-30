import { SquaddieSquaddieResults } from "./squaddieSquaddieResults"
import { ProcessedAction } from "../../action/processed/processedAction"
import { isValidValue } from "../../utils/validityCheck"

export interface BattleEvent {
    results: SquaddieSquaddieResults
    processedAction: ProcessedAction
}

export const BattleEventService = {
    new: ({
        results,
        processedAction,
    }: {
        results: SquaddieSquaddieResults
        processedAction?: ProcessedAction
    }): BattleEvent => {
        if (!isValidValue(processedAction)) {
            throw new Error("BattleEvent needs a processed action")
        }

        return {
            results,
            processedAction,
        }
    },
    clone: (original: BattleEvent): BattleEvent => {
        return {
            results: { ...original.results },
            processedAction: { ...original.processedAction },
        }
    },
}
