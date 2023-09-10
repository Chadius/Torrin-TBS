import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {TeamStrategyState} from "./teamStrategyState";

export interface TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieActivitiesForThisRound | undefined;
}
