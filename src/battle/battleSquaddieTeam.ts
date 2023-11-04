import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {unTintSquaddieMapIcon} from "./animation/drawSquaddie";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../squaddie/squaddieService";

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
            battleSquaddie.beginNewRound();
            unTintSquaddieMapIcon(squaddieTemplate, battleSquaddie);
        }));
    }
};

export class BattleSquaddieTeamOLD {
    name: string;
    squaddieRepo: BattleSquaddieRepository;
    battleSquaddieIds: string[];

    constructor(options: {
        name: string;
        affiliation: SquaddieAffiliation;
        squaddieRepo: BattleSquaddieRepository;
        battleSquaddieIds?: string[];
    }) {
        this.name = options.name;
        this._affiliation = options.affiliation;
        this.squaddieRepo = options.squaddieRepo;

        this.battleSquaddieIds = [];
        if (options.battleSquaddieIds) {
            this.addBattleSquaddieIds(options.battleSquaddieIds);
        }
    }

    private _affiliation: SquaddieAffiliation;

    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }

    hasSquaddies(): boolean {
        return this.battleSquaddieIds.length > 0;
    }

    hasAnActingSquaddie(): boolean {
        return this.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByBattleId(battleSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie,});
            return canAct;
        })
    }

    addBattleSquaddieIds(battleSquaddieIds: string[]) {
        this.battleSquaddieIds = [
            ...this.battleSquaddieIds,
            ...battleSquaddieIds.filter(notEmptyString => notEmptyString),
        ]
    }

    canPlayerControlAnySquaddieOnThisTeamRightNow() {
        return this.battleSquaddieIds.some(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByBattleId(battleSquaddieId));
            const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            });
            return playerCanControlThisSquaddieRightNow;
        })
    }

    getBattleSquaddieIdThatCanActButNotPlayerControlled(): string {
        return this.battleSquaddieIds.find(battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByBattleId(battleSquaddieId));
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation
            } = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie,});
            return !squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct;
        })
    }

    getBattleSquaddiesThatCanAct(): string[] {
        return this.battleSquaddieIds.filter(battleSquaddieId => {
            const {
                squaddieTemplate, battleSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByBattleId(battleSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie,});
            return canAct;
        });
    }

    beginNewRound() {
        this.battleSquaddieIds.forEach((battleSquaddieId => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByBattleId(battleSquaddieId));
            battleSquaddie.beginNewRound();
            unTintSquaddieMapIcon(squaddieTemplate, battleSquaddie);
        }));
    }
}
