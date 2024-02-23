import {TeamStrategy, TeamStrategyType} from "./teamStrategy";
import {ObjectRepository} from "../objectRepository";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {EndTurnTeamStrategy} from "./endTurn";
import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {DecidedAction} from "../../action/decided/decidedAction";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {MissionMap} from "../../missionMap/missionMap";
import {ActionsThisRound} from "../history/actionsThisRound";

export const DetermineNextDecisionService = {
    determineNextDecision: ({
                                team,
                                missionMap,
                                repository,
                                actionsThisRound,
                                strategy,
                            }: {
        team: BattleSquaddieTeam,
        missionMap: MissionMap,
        repository: ObjectRepository,
        actionsThisRound: ActionsThisRound,
        strategy: TeamStrategy,
    }): DecidedAction => {
        return determineNextDecision({
            team,
            missionMap,
            repository,
            actionsThisRound,
            strategy,
        });
    }
}

const determineNextDecision = ({
                                   team,
                                   missionMap,
                                   repository,
                                   actionsThisRound,
                                   strategy,
                               }: {
    team: BattleSquaddieTeam,
    missionMap: MissionMap,
    repository: ObjectRepository,
    actionsThisRound: ActionsThisRound,
    strategy: TeamStrategy,
}): DecidedAction => {
    let calculator: TeamStrategyCalculator;
    switch (strategy.type) {
        case TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE:
            calculator = new MoveCloserToSquaddie(strategy.options);
            break;
        case TeamStrategyType.TARGET_SQUADDIE_IN_RANGE:
            calculator = new TargetSquaddieInRange(strategy.options);
            break;
        default:
            calculator = new EndTurnTeamStrategy(strategy.options);
            break;
    }
    return calculator.DetermineNextInstruction({
        team,
        missionMap,
        repository,
        actionsThisRound,
    });
}
