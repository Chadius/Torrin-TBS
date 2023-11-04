import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export interface TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState, squaddieRepository: BattleSquaddieRepository): SquaddieActionsForThisRound | undefined;
}
