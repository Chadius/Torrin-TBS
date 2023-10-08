import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {unTintSquaddieMapIcon} from "./animation/drawSquaddie";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../squaddie/squaddieService";

export class BattleSquaddieTeam {
    name: string;
    squaddieRepo: BattleSquaddieRepository;
    dynamicSquaddieIds: string[];

    constructor(options: {
        name: string;
        affiliation: SquaddieAffiliation;
        squaddieRepo: BattleSquaddieRepository;
        dynamicSquaddieIds?: string[];
    }) {
        this.name = options.name;
        this._affiliation = options.affiliation;
        this.squaddieRepo = options.squaddieRepo;

        this.dynamicSquaddieIds = [];
        if (options.dynamicSquaddieIds) {
            this.addDynamicSquaddieIds(options.dynamicSquaddieIds);
        }
    }

    private _affiliation: SquaddieAffiliation;

    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }

    hasSquaddies(): boolean {
        return this.dynamicSquaddieIds.length > 0;
    }

    hasAnActingSquaddie(): boolean {
        return this.dynamicSquaddieIds.some(dynamicSquaddieId => {
            const {
                squaddietemplate,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddietemplate, dynamicSquaddie,});
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
                squaddietemplate,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                squaddietemplate,
                dynamicSquaddie,
            });
            return playerCanControlThisSquaddieRightNow;
        })
    }

    getDynamicSquaddieIdThatCanActButNotPlayerControlled(): string {
        return this.dynamicSquaddieIds.find(dynamicSquaddieId => {
            const {
                squaddietemplate,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {
                squaddieCanCurrentlyAct,
                squaddieHasThePlayerControlledAffiliation
            } = CanPlayerControlSquaddieRightNow({squaddietemplate, dynamicSquaddie,});
            return !squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct;
        })
    }

    getDynamicSquaddiesThatCanAct(): string[] {
        return this.dynamicSquaddieIds.filter(dynamicSquaddieId => {
            const {
                squaddietemplate, dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            const {canAct} = CanSquaddieActRightNow({squaddietemplate, dynamicSquaddie,});
            return canAct;
        });
    }

    beginNewRound() {
        this.dynamicSquaddieIds.forEach((dynamicSquaddieId => {
            const {
                squaddietemplate,
                dynamicSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
            dynamicSquaddie.beginNewRound();
            unTintSquaddieMapIcon(squaddietemplate, dynamicSquaddie);
        }));
    }
}
