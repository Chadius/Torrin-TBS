import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";

export interface TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined;
}
