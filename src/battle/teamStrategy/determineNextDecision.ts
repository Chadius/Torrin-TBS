import {TeamStrategy, TeamStrategyType} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {ObjectRepository} from "../objectRepository";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {EndTurnTeamStrategy} from "./endTurn";
import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {SquaddieDecisionsDuringThisPhase} from "../history/squaddieDecisionsDuringThisPhase";

export const DetermineNextDecision = ({strategy, state, squaddieRepository}:
                                          {
                                              strategy: TeamStrategy,
                                              state: TeamStrategyState,
                                              squaddieRepository: ObjectRepository
                                          }): SquaddieDecisionsDuringThisPhase => {
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
