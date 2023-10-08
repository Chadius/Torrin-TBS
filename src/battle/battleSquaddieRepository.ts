import {BattleSquaddie} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export class BattleSquaddieRepository {
    private squaddieStaticInfoById: {
        [id: string]: SquaddieTemplate;
    }

    private squaddieDynamicInfoByDynamicId: {
        [id: string]: BattleSquaddie;
    }

    constructor() {
        this.reset();
    }

    addSquaddietemplate(squaddietemplate: SquaddieTemplate) {
        if (this.squaddieStaticInfoById[squaddietemplate.squaddieId.staticId]) {
            throw new Error(`cannot addSquaddietemplate '${squaddietemplate.squaddieId.staticId}', is already added`);
        }

        this.squaddieStaticInfoById[squaddietemplate.squaddieId.staticId] = squaddietemplate;
    }

    addDynamicSquaddie(dynamicSquaddie: BattleSquaddie) {
        dynamicSquaddie.assertBattleSquaddieDynamic();
        if (!this.squaddieStaticInfoById[dynamicSquaddie.squaddieTemplateId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddie.dynamicSquaddieId}', no static squaddie '${dynamicSquaddie.squaddieTemplateId}' exists`);
        }

        if (this.squaddieDynamicInfoByDynamicId[dynamicSquaddie.dynamicSquaddieId]) {
            throw new Error(`cannot addDynamicSquaddie '${dynamicSquaddie.dynamicSquaddieId}', again, it already exists`);
        }

        const squaddietemplate: SquaddieTemplate = this.squaddieStaticInfoById[dynamicSquaddie.squaddieTemplateId];
        dynamicSquaddie.initializeInBattleAttributes(squaddietemplate.attributes);

        this.squaddieDynamicInfoByDynamicId[dynamicSquaddie.dynamicSquaddieId] = dynamicSquaddie;
    }

    addSquaddie(squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie) {
        this.addSquaddietemplate(squaddietemplate);
        this.addDynamicSquaddie(dynamicSquaddie);
    }

    getSquaddieByDynamicId(dynamicSquaddieId: string): ResultOrError<{
        squaddietemplate: SquaddieTemplate,
        dynamicSquaddie: BattleSquaddie,
    }, Error> {
        const dynamicSquaddie: BattleSquaddie = this.squaddieDynamicInfoByDynamicId[dynamicSquaddieId];
        if (!dynamicSquaddie) {
            return makeError(new Error(`cannot getDynamicSquaddieByID for '${dynamicSquaddieId}', does not exist`));
        }

        const squaddietemplate: SquaddieTemplate = this.squaddieStaticInfoById[dynamicSquaddie.squaddieTemplateId];

        return makeResult({
            squaddietemplate,
            dynamicSquaddie,
        });
    }

    getSquaddietemplateIterator(): { squaddietemplateId: string, squaddietemplate: SquaddieTemplate }[] {
        return Object.entries(this.squaddieStaticInfoById).map(([squaddietemplateId, squaddietemplate]) => {
            return {
                squaddietemplate,
                squaddietemplateId,
            };
        });
    }

    getDynamicSquaddieIterator(): { dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddie }[] {
        return Object.entries(this.squaddieDynamicInfoByDynamicId).map(([dynamicSquaddieId, dynamicSquaddie]) => {
            return {
                dynamicSquaddie,
                dynamicSquaddieId,
            };
        });
    }

    reset() {
        this.squaddieDynamicInfoByDynamicId = {};
        this.squaddieStaticInfoById = {};
    }
}
