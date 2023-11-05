import {TeamStrategy, TeamStrategyType} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {EndTurnTeamStrategy} from "./endTurn";
import {TeamStrategyCalculator} from "./teamStrategyCalculator";

export const DetermineNextInstruction = ({strategy, state, squaddieRepository}:
                                             {
                                                 strategy: TeamStrategy,
                                                 state: TeamStrategyState,
                                                 squaddieRepository: BattleSquaddieRepository
                                             }) => {
    let calculator: TeamStrategyCalculator;
    switch (strategy.type) {
        case TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE:
            calculator = new MoveCloserToSquaddie(strategy.options);
            return calculator.DetermineNextInstruction(state, squaddieRepository);
        case TeamStrategyType.TARGET_SQUADDIE_IN_RANGE:
            calculator = new TargetSquaddieInRange(strategy.options);
            return calculator.DetermineNextInstruction(state, squaddieRepository);
        default:
            calculator = new EndTurnTeamStrategy(strategy.options);
            return calculator.DetermineNextInstruction(state, squaddieRepository);
    }
}
