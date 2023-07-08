import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieSquaddieResults} from "./squaddieSquaddieResults";
import {SquaddieInstructionActivity} from "./squaddieInstructionActivity";

export class BattleEvent {
    get instruction(): SquaddieInstructionInProgress {
        return this._instruction;
    }

    get results(): SquaddieSquaddieResults {
        return this._results;
    }

    get activities(): SquaddieInstructionActivity[] {
        return [...this._instruction.instruction.activities];
    }

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
        this._results = results ?? new SquaddieSquaddieResults({});
    }
}
