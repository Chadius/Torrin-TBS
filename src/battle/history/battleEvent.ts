import { SquaddieSquaddieResults } from "./squaddieSquaddieResults"
import { ProcessedAction } from "../../action/processed/processedAction"
import { isValidValue } from "../../utils/validityCheck"
import { BattleAction } from "./battleAction/battleAction"

export interface BattleEvent {
    results: SquaddieSquaddieResults
    processedAction: ProcessedAction
    battleAction: BattleAction
}

export const BattleEventService = {
    new: ({
        results,
        processedAction,
        battleAction,
    }: {
        results: SquaddieSquaddieResults
        processedAction?: ProcessedAction
        battleAction?: BattleAction
    }): BattleEvent => {
        if (!isValidValue(processedAction) && !isValidValue(battleAction)) {
            throw new Error("BattleEvent needs an action")
        }

        return {
            results,
            processedAction,
            battleAction,
        }
    },
    clone: (original: BattleEvent): BattleEvent => {
        return { ...original }
    },
}
