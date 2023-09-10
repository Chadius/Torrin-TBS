import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export class EndTurnTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieActivitiesForThisRound | undefined {
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
        const endTurnActivity: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId: squaddieToAct,
            startingLocation: datum.mapLocation,
        });
        endTurnActivity.endTurn();

        state.setInstruction(endTurnActivity);

        return endTurnActivity;
    }
}
