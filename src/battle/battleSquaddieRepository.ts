import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";

export class BattleSquaddieRepository {
    squaddieStaticInfoByID: {
        [id: string]: BattleSquaddieStatic;
    }

    squaddieDynamicInfoByDyanmicID: {
        [id: string]: BattleSquaddieDynamic;
    }

    constructor() {
        this.squaddieDynamicInfoByDyanmicID = {};
        this.squaddieStaticInfoByID = {};
    }

    addStaticSquaddie(staticSquaddie: BattleSquaddieStatic) {
        if (this.squaddieStaticInfoByID[staticSquaddie.squaddieID.id]) {
            throw new Error(`cannot addStaticSquaddie '${staticSquaddie.squaddieID.id}', is already added`);
        }

        this.squaddieStaticInfoByID[staticSquaddie.squaddieID.id] = staticSquaddie;
    }

    addDynamicSquaddie(dynamicSquaddieID: string, dynamicSquaddie: BattleSquaddieDynamic) {
        if (!this.squaddieStaticInfoByID[dynamicSquaddie.staticSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddieID}', no static squaddie '${dynamicSquaddie.staticSquaddieId}' exists`);
        }

        if(this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieID]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddieID}', again, it already exists`);
        }

        this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieID] = dynamicSquaddie;
    }

    getSquaddieByDynamicID(dynamicSquaddieID: string): ResultOrError<{staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic}, Error>  {
        const dynamicSquaddie: BattleSquaddieDynamic = this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieID];
        if(!dynamicSquaddie) {
            return makeError(new Error (`cannot getDynamicSquaddieByID for '${dynamicSquaddieID}', does not exist`));
        }

        const staticSquaddie: BattleSquaddieStatic = this.squaddieStaticInfoByID[dynamicSquaddie.staticSquaddieId];

        return makeResult({
            staticSquaddie,
            dynamicSquaddie,
        });
    }

    getStaticSquaddieIterator(): {staticSquaddieId: string, staticSquaddie: BattleSquaddieStatic}[] {
        return Object.entries(this.squaddieStaticInfoByID).map(([staticSquaddieId, staticSquaddie]) => {
            return {
                staticSquaddie,
                staticSquaddieId,
            };
        });
    }

    getDynamicSquaddieIterator(): {dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic}[] {
        return Object.entries(this.squaddieDynamicInfoByDyanmicID).map(([dynamicSquaddieId, dynamicSquaddie]) => {
            return {
                dynamicSquaddie,
                dynamicSquaddieId,
            };
        });
    }
}