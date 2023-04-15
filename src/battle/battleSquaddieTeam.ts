import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError} from "../utils/ResultOrError";

export type BattleSquaddieTeamOptions = {
    name: string;
    affiliation: SquaddieAffiliation;
    squaddieRepo: BattleSquaddieRepository;
    dynamicSquaddieIds?: string[];
}

export class BattleSquaddieTeam {
    name: string;
    affiliation: SquaddieAffiliation;
    squaddieRepo: BattleSquaddieRepository;
    dynamicSquaddieIds: string[];

    constructor(options: BattleSquaddieTeamOptions) {
        this.name = options.name;
        this.affiliation = options.affiliation;
        this.squaddieRepo = options.squaddieRepo;

        this.dynamicSquaddieIds = [];
        if (options.dynamicSquaddieIds) {
            this.addDynamicSquaddieIds(options.dynamicSquaddieIds);
        }
    }

    hasSquaddies(): boolean {
        return this.dynamicSquaddieIds.length > 0;
    }

    getAffiliation(): SquaddieAffiliation {
        return this.affiliation;
    }

    hasAnActingSquaddie(): boolean {
        return this.dynamicSquaddieIds.some(dynamicSquaddieId => {
            const {dynamicSquaddie} = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));
            return dynamicSquaddie.canStillActThisRound();
        })
    }

    addDynamicSquaddieIds(dynamicSquaddieIds: string[]) {
        this.dynamicSquaddieIds = [
            ...this.dynamicSquaddieIds,
            ...dynamicSquaddieIds.filter(notEmptyString => notEmptyString),
        ]
    }
}