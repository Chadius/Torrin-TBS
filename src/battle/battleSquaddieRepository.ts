import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {HexCoordinate} from "../hexMap/hexGrid";

export class BattleSquaddieRepository {
    squaddieStaticInfoById: {
        [id: string]: BattleSquaddieStatic;
    }

    squaddieDynamicInfoByDynamicId: {
        [id: string]: BattleSquaddieDynamic;
    }

    constructor() {
        this.squaddieDynamicInfoByDynamicId = {};
        this.squaddieStaticInfoById = {};
    }

    addStaticSquaddie(staticSquaddie: BattleSquaddieStatic) {
        if (this.squaddieStaticInfoById[staticSquaddie.squaddieId.staticId]) {
            throw new Error(`cannot addStaticSquaddie '${staticSquaddie.squaddieId.staticId}', is already added`);
        }

        this.squaddieStaticInfoById[staticSquaddie.squaddieId.staticId] = staticSquaddie;
    }

    addDynamicSquaddie(dynamicSquaddie: BattleSquaddieDynamic) {
        dynamicSquaddie.assertBattleSquaddieDynamic();
        if (!this.squaddieStaticInfoById[dynamicSquaddie.staticSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddie.dynamicSquaddieId}', no static squaddie '${dynamicSquaddie.staticSquaddieId}' exists`);
        }

        if (this.squaddieDynamicInfoByDynamicId[dynamicSquaddie.dynamicSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddie.dynamicSquaddieId}', again, it already exists`);
        }

        this.squaddieDynamicInfoByDynamicId[dynamicSquaddie.dynamicSquaddieId] = dynamicSquaddie;
    }

    addSquaddie(staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic) {
        this.addStaticSquaddie(staticSquaddie);
        this.addDynamicSquaddie(dynamicSquaddie);
    }

    getSquaddieByDynamicID(dynamicSquaddieId: string): ResultOrError<{
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
    }, Error> {
        const dynamicSquaddie: BattleSquaddieDynamic = this.squaddieDynamicInfoByDynamicId[dynamicSquaddieId];
        if (!dynamicSquaddie) {
            return makeError(new Error(`cannot getDynamicSquaddieByID for '${dynamicSquaddieId}', does not exist`));
        }

        const staticSquaddie: BattleSquaddieStatic = this.squaddieStaticInfoById[dynamicSquaddie.staticSquaddieId];

        return makeResult({
            staticSquaddie,
            dynamicSquaddie,
        });
    }

    getStaticSquaddieIterator(): { staticSquaddieId: string, staticSquaddie: BattleSquaddieStatic }[] {
        return Object.entries(this.squaddieStaticInfoById).map(([staticSquaddieId, staticSquaddie]) => {
            return {
                staticSquaddie,
                staticSquaddieId,
            };
        });
    }

    getDynamicSquaddieIterator(): { dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic }[] {
        return Object.entries(this.squaddieDynamicInfoByDynamicId).map(([dynamicSquaddieId, dynamicSquaddie]) => {
            return {
                dynamicSquaddie,
                dynamicSquaddieId,
            };
        });
    }

    getSquaddieByStaticIdAndLocation(staticID: string, mapLocation: HexCoordinate): ResultOrError<{
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
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
