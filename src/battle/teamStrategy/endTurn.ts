import {TeamStrategyCalculator} from "./teamStrategyCalculator";
import {TeamStrategyState} from "./teamStrategyState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {TeamStrategyOptions} from "./teamStrategy";
import {DecisionService} from "../../decision/decision";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

export class EndTurnTeamStrategy implements TeamStrategyCalculator {
    constructor(options: TeamStrategyOptions) {
    }

    DetermineNextInstruction(state: TeamStrategyState, repository: ObjectRepository): SquaddieDecisionsDuringThisPhase | undefined {
        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, squaddieToAct));

        const datum = state.missionMap.getSquaddieByBattleId(squaddieToAct);
        const endTurnAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
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
