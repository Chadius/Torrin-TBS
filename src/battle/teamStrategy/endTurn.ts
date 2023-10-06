import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export class EndTurnTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
        const squaddiesWhoCanAct: string[] = state.team.getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieToAct));

        const datum = state.missionMap.getSquaddieByDynamicId(squaddieToAct);
        const endTurnAction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId: squaddieToAct,
            startingLocation: datum.mapLocation,
        });
        endTurnAction.endTurn();

        state.setInstruction(endTurnAction);

        return endTurnAction;
    }
}
