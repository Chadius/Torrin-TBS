import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {DecidedAction} from "../../action/decided/decidedAction";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {ActionsThisRound} from "../history/actionsThisRound";
import {isValidValue} from "../../utils/validityCheck";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieService} from "../../squaddie/squaddieService";

export interface TeamStrategyCalculator {
    DetermineNextInstruction({
                                 team,
                                 missionMap,
                                 repository,
                                 actionsThisRound,
                             }: {
        team: BattleSquaddieTeam,
        missionMap: MissionMap,
        repository: ObjectRepository,
        actionsThisRound: ActionsThisRound,
    }): DecidedAction;
}

export const TeamStrategyService = {
    getCurrentlyActingSquaddieWhoCanAct: (team: BattleSquaddieTeam, actionsThisRound: ActionsThisRound, repository: ObjectRepository): string => {
        if (!isValidValue(team)) {
            return undefined;
        }

        let battleSquaddieIdToAct = getBattleSquaddieWhoCanAct(team, repository);
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined;
        }

        if (isValidValue(actionsThisRound) && isValidValue(actionsThisRound.battleSquaddieId)) {
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, actionsThisRound.battleSquaddieId))
            const {canAct} = SquaddieService.canSquaddieActRightNow({battleSquaddie, squaddieTemplate});
            if (canAct) {
                return battleSquaddie.battleSquaddieId;
            }
        }

        return battleSquaddieIdToAct;
    },
    getBattleSquaddieWhoCanAct: (team: BattleSquaddieTeam, repository: ObjectRepository): string => {
        return getBattleSquaddieWhoCanAct(team, repository);
    }
}


const getBattleSquaddieWhoCanAct = (team: BattleSquaddieTeam, repository: ObjectRepository): string => {
    const squaddiesWhoCanAct: string[] = BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(team, repository);
    if (squaddiesWhoCanAct.length === 0) {
        return undefined;
    }

    return squaddiesWhoCanAct[0];
}
