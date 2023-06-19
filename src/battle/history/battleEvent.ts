import {SquaddieInstruction} from "./squaddieInstruction";

export class BattleEvent {
    instruction: SquaddieInstruction;

    constructor(options: {
        instruction: SquaddieInstruction;
    }) {
        this.instruction = options.instruction;
    }
}
