import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ObjectRepository, ObjectRepositoryHelper} from "./objectRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {TintSquaddieIfTurnIsComplete, unTintSquaddieMapIcon} from "./animation/drawSquaddie";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../squaddie/squaddieService";
import {BattleSquaddieHelper} from "./battleSquaddie";
import {isValidValue} from "../utils/validityCheck";

export interface BattleSquaddieTeam {
    id: string;
    name: string;
    affiliation: SquaddieAffiliation;
    battleSquaddieIds: string[];
    iconResourceKey: string,
}

export const BattleSquaddieTeamHelper = {
    hasSquaddies: (team: BattleSquaddieTeam): boolean => {
        return team.battleSquaddieIds.length > 0;
    },
    hasAnActingSquaddie: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository): boolean => {
        return isValidValue(team.battleSquaddieIds) && team.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie,});
            return canAct;
        })
    },
    addBattleSquaddieIds: (team: BattleSquaddieTeam, battleSquaddieIds: string[]) => {
        team.battleSquaddieIds = [
            ...team.battleSquaddieIds,
            ...battleSquaddieIds.filter(notEmptyString => {
                return notEmptyString
                    && !team.battleSquaddieIds.includes(notEmptyString)
            }),
        ]
    },
    canPlayerControlAnySquaddieOnThisTeamRightNow: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository): boolean => {
        return team.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            });
            return playerCanControlThisSquaddieRightNow;
        })
    },
    getBattleSquaddieIdThatCanActButNotPlayerControlled: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository): string => {
        return team.battleSquaddieIds.find(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation
            } = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie,});
            return !squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct;
        })
    },
    getBattleSquaddiesThatCanAct: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository): string[] => {
        return team.battleSquaddieIds.filter(battleSquaddieId => {
            const {
                squaddieTemplate, battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie,});
            return canAct;
        });
    },
    beginNewRound: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository) => {
        team.battleSquaddieIds.forEach((battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            BattleSquaddieHelper.beginNewRound(battleSquaddie);
            unTintSquaddieMapIcon(squaddieRepository, battleSquaddie);
        }));
    },
    sanitize: (data: BattleSquaddieTeam): BattleSquaddieTeam => {
        return sanitize(data);
    },
    endTurn: (team: BattleSquaddieTeam, squaddieRepository: ObjectRepository) => {
        team.battleSquaddieIds.forEach((battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
            BattleSquaddieHelper.endTurn(battleSquaddie);
            TintSquaddieIfTurnIsComplete(squaddieRepository, battleSquaddie, squaddieTemplate);
        }));
    },
};

const sanitize = (data: BattleSquaddieTeam): BattleSquaddieTeam => {
    if (!data.name || !isValidValue(data.name)) {
        throw new Error('BattleSquaddieTeam cannot sanitize, missing name');
    }

    if (!data.id || !isValidValue(data.id)) {
        throw new Error('BattleSquaddieTeam cannot sanitize, missing id');
    }

    if (!isValidValue(data.battleSquaddieIds)) {
        data.battleSquaddieIds = [];
    }
    if (!isValidValue(data.affiliation)) {
        data.affiliation = SquaddieAffiliation.UNKNOWN;
    }

    if (!isValidValue(data.iconResourceKey)) {
        data.iconResourceKey = "";
    }

    return data;
}
