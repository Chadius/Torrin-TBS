import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";

export class BattleEvent {
    instruction: SquaddieInstructionInProgress;

    constructor(options: {
        currentSquaddieInstruction: SquaddieInstructionInProgress;
    }) {
        this.instruction = options.currentSquaddieInstruction;
    }
}
