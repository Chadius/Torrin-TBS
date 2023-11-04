import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export class EndTurnTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState, repository: BattleSquaddieRepository): SquaddieActionsForThisRound | undefined {
        const squaddiesWhoCanAct: string[] = BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(state.team, repository);
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(squaddieToAct));

        const datum = state.missionMap.getSquaddieByBattleId(squaddieToAct);
        const endTurnAction: SquaddieActionsForThisRound = {
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId: squaddieToAct,
            startingLocation: datum.mapLocation,
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(endTurnAction);

        state.setInstruction(endTurnAction);

        return endTurnAction;
    }
}
