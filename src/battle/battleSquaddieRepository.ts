import {assertBattleSquaddieDynamic, BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {HexCoordinate} from "../hexMap/hexGrid";

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

    addDynamicSquaddie(dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic) {
        assertBattleSquaddieDynamic(dynamicSquaddie);
        if (!this.squaddieStaticInfoByID[dynamicSquaddie.staticSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddieId}', no static squaddie '${dynamicSquaddie.staticSquaddieId}' exists`);
        }

        if (this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddieId}', again, it already exists`);
        }

        this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieId] = dynamicSquaddie;
    }

    getSquaddieByDynamicID(dynamicSquaddieId: string): ResultOrError<{
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
        dynamicSquaddieId: string,
    }, Error> {
        const dynamicSquaddie: BattleSquaddieDynamic = this.squaddieDynamicInfoByDyanmicID[dynamicSquaddieId];
        if (!dynamicSquaddie) {
            return makeError(new Error(`cannot getDynamicSquaddieByID for '${dynamicSquaddieId}', does not exist`));
        }

        const staticSquaddie: BattleSquaddieStatic = this.squaddieStaticInfoByID[dynamicSquaddie.staticSquaddieId];

        return makeResult({
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        });
    }

    getStaticSquaddieIterator(): { staticSquaddieId: string, staticSquaddie: BattleSquaddieStatic }[] {
        return Object.entries(this.squaddieStaticInfoByID).map(([staticSquaddieId, staticSquaddie]) => {
            return {
                staticSquaddie,
                staticSquaddieId,
            };
        });
    }

    getDynamicSquaddieIterator(): { dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic }[] {
        return Object.entries(this.squaddieDynamicInfoByDyanmicID).map(([dynamicSquaddieId, dynamicSquaddie]) => {
            return {
                dynamicSquaddie,
                dynamicSquaddieId,
            };
        });
    }

    getSquaddieByStaticIDAndLocation(staticID: string, mapLocation: HexCoordinate): ResultOrError<{
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
        dynamicSquaddieId: string,
    }, Error> {
        const dynamicSquaddieInfo = this.getDynamicSquaddieIterator().find((info) =>
            info.dynamicSquaddie.mapLocation.q === mapLocation.q
            && info.dynamicSquaddie.mapLocation.r === mapLocation.r
        );

        if (!dynamicSquaddieInfo) {
            return makeError(new Error(`cannot find squaddie at location (${mapLocation.q}, ${mapLocation.r})`));
        }

        const {
            dynamicSquaddieId
        } = dynamicSquaddieInfo;

        return this.getSquaddieByDynamicID(dynamicSquaddieId);
    }
}