import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {unTintSquaddieMapIcon} from "./animation/drawSquaddie";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../squaddie/squaddieService";

export type BattleSquaddieTeamOptions = {
    name: string;
    affiliation: SquaddieAffiliation;
    squaddieRepo: BattleSquaddieRepository;
    dynamicSquaddieIds?: string[];
}

export class BattleSquaddieTeam {
    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }

    name: string;
    private _affiliation: SquaddieAffiliation;
    squaddieRepo: BattleSquaddieRepository;
    dynamicSquaddieIds: string[];

    constructor(options: BattleSquaddieTeamOptions) {
        this.name = options.name;
        this._affiliation = options.affiliation;
        this.squaddieRepo = options.squaddieRepo;

        this.dynamicSquaddieIds = [];
        if (options.dynamicSquaddieIds) {
            this.addDynamicSquaddieIds(options.dynamicSquaddieIds);
        }
    }

    hasSquaddies(): boolean {
        return this.dynamicSquaddieIds.length > 0;
    }

    hasAnActingSquaddie(): boolean {
        return this.dynamicSquaddieIds.some(dynamicSquaddieId => {
            const {
                staticSquaddie,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {canAct} = CanSquaddieActRightNow({staticSquaddie, dynamicSquaddie,});
            return canAct;
        })
    }

    addDynamicSquaddieIds(dynamicSquaddieIds: string[]) {
        this.dynamicSquaddieIds = [
            ...this.dynamicSquaddieIds,
            ...dynamicSquaddieIds.filter(notEmptyString => notEmptyString),
        ]
    }

    canPlayerControlAnySquaddieOnThisTeamRightNow() {
        return this.dynamicSquaddieIds.some(dynamicSquaddieId => {
            const {
                staticSquaddie,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                staticSquaddie,
                dynamicSquaddie,
            });
            return playerCanControlThisSquaddieRightNow;
        })
    }

    getDynamicSquaddieIdThatCanActButNotPlayerControlled(): string {
        return this.dynamicSquaddieIds.find(dynamicSquaddieId => {
            const {
                staticSquaddie,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation
            } = CanPlayerControlSquaddieRightNow({staticSquaddie, dynamicSquaddie,});
            return !squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct;
        })
    }

    getDynamicSquaddiesThatCanAct(): string[] {
        return this.dynamicSquaddieIds.filter(dynamicSquaddieId => {
            const {
                staticSquaddie, dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {canAct} = CanSquaddieActRightNow({staticSquaddie, dynamicSquaddie,});
            return canAct;
        });
    }

    beginNewRound() {
        this.dynamicSquaddieIds.forEach((dynamicSquaddieId => {
            const {
                staticSquaddie,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            dynamicSquaddie.beginNewRound();
            unTintSquaddieMapIcon(staticSquaddie, dynamicSquaddie);
        }));
    }
}
