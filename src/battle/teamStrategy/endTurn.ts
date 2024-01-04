import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {TeamStrategyOptions} from "./teamStrategy";
import {DecisionService} from "../../decision/decision";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

export class EndTurnTeamStrategy implements TeamStrategyCalculator {
    constructor(options: TeamStrategyOptions) {
    }

    DetermineNextInstruction(state: TeamStrategyState, repository: ObjectRepository): SquaddieActionsForThisRound | undefined {
        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository, squaddieToAct));

        const datum = state.missionMap.getSquaddieByBattleId(squaddieToAct);
        const endTurnAction: SquaddieActionsForThisRound = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId: squaddieToAct,
            startingLocation: datum.mapLocation,
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        state.setInstruction(endTurnAction);

        return endTurnAction;
    }
}
