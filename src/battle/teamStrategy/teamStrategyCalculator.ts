import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";
import {ObjectRepository} from "../objectRepository";

export interface TeamStrategyCalculator {
    DetermineNextInstruction(state: TeamStrategyState, squaddieRepository: ObjectRepository): SquaddieActionsForThisRound | undefined;
}

