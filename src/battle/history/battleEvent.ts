import {CurrentSquaddieInstruction} from "./currentSquaddieInstruction";

export class BattleEvent {
    instruction: CurrentSquaddieInstruction;

    constructor(options: {
        currentSquaddieInstruction: CurrentSquaddieInstruction;
    }) {
        this.instruction = options.currentSquaddieInstruction;
    }
}
