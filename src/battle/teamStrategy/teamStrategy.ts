import {SquaddieInstruction} from "../history/squaddieInstruction";
import {TeamStrategyState} from "./teamStrategyState";

export interface TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined;
}
