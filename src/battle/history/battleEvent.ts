import {SquaddieInstruction} from "./squaddieInstruction";

export type BattleEventOptions = {
    instruction: SquaddieInstruction;
}

export class BattleEvent {
    instruction: SquaddieInstruction;

    constructor(options: BattleEventOptions) {
        this.instruction = options.instruction;
    }
}
