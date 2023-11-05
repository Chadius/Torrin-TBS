import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export interface TeamStrategyCalculator {
    DetermineNextInstruction(state: TeamStrategyState, squaddieRepository: BattleSquaddieRepository): SquaddieActionsForThisRound | undefined;
}

