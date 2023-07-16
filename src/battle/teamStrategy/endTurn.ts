import {TeamStrategy} from "./teamStrategy";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export class EndTurnTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
        const squaddiesWhoCanAct: string[] = state.getTeam().getDynamicSquaddiesThatCanAct();
        if (squaddiesWhoCanAct.length === 0) {
            return undefined;
        }

        const squaddieToAct = squaddiesWhoCanAct[0];
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.getSquaddieRepository().getSquaddieByDynamicId(squaddieToAct));

        const datum = state.getMissionMap().getSquaddieByDynamicId(squaddieToAct);
        const endTurnActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId: squaddieToAct,
            startingLocation: datum.mapLocation,
        });
        endTurnActivity.endTurn();

        state.setInstruction(endTurnActivity);

        return endTurnActivity;
    }
}
