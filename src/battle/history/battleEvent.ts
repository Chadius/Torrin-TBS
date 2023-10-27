import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {AnySquaddieActionData} from "./anySquaddieAction";

export class BattleEvent {
    private readonly _instruction: SquaddieInstructionInProgress;
    private readonly _results: SquaddieSquaddieResults;

    constructor({
                    currentSquaddieInstruction,
                    results,
                }: {
        currentSquaddieInstruction: SquaddieInstructionInProgress,
        results?: SquaddieSquaddieResults
    }) {
        this._instruction = currentSquaddieInstruction;
        this._results = results ?? {
            actingBattleSquaddieId: undefined,
            resultPerTarget: {},
            targetedBattleSquaddieIds: [],
        };
    }

    get instruction(): SquaddieInstructionInProgress {
        return this._instruction;
    }

    get results(): SquaddieSquaddieResults {
        return this._results;
    }

    get actions(): AnySquaddieActionData[] {
        return [...this._instruction.squaddieActionsForThisRound.actions];
    }
}

export const CloneBattleEvent = (original: BattleEvent): BattleEvent => {
    return new BattleEvent({
        currentSquaddieInstruction: original.instruction,
        results: original.results,
    });
}
