import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {unTintSquaddieMapIcon} from "./animation/drawSquaddie";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../squaddie/squaddieService";
import {BattleSquaddieHelper} from "./battleSquaddie";

export interface BattleSquaddieTeam {
    name: string;
    affiliation: SquaddieAffiliation;
    battleSquaddieIds: string[];
}

export const BattleSquaddieTeamHelper = {
    hasSquaddies: (team: BattleSquaddieTeam): boolean => {
        return team.battleSquaddieIds.length > 0;
    },
    hasAnActingSquaddie: (team: BattleSquaddieTeam, squaddieRepository: BattleSquaddieRepository): boolean => {
        return team.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
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
    canPlayerControlAnySquaddieOnThisTeamRightNow: (team: BattleSquaddieTeam, squaddieRepository: BattleSquaddieRepository): boolean => {
        return team.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
            const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            });
            return playerCanControlThisSquaddieRightNow;
        })
    },
    getBattleSquaddieIdThatCanActButNotPlayerControlled: (team: BattleSquaddieTeam, squaddieRepository: BattleSquaddieRepository): string => {
        return team.battleSquaddieIds.find(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation
            } = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie,});
            return !squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct;
        })
    },
    getBattleSquaddiesThatCanAct: (team: BattleSquaddieTeam, squaddieRepository: BattleSquaddieRepository): string[] => {
        return team.battleSquaddieIds.filter(battleSquaddieId => {
            const {
                squaddieTemplate, battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie,});
            return canAct;
        });
    },
    beginNewRound: (team: BattleSquaddieTeam, squaddieRepository: BattleSquaddieRepository) => {
        team.battleSquaddieIds.forEach((battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
            BattleSquaddieHelper.beginNewRound(battleSquaddie);
            unTintSquaddieMapIcon(squaddieRepository, battleSquaddie);
        }));
    }
};
