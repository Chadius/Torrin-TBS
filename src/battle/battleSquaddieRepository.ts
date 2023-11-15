import {BattleSquaddie} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {ImageUI} from "../ui/imageUI";

export class BattleSquaddieRepository {
    imageUIByBattleSquaddieId: {
        [id: string]: ImageUI;
    }
    private squaddieTemplates: {
        [id: string]: SquaddieTemplate;
    }
    private battleSquaddies: {
        [id: string]: BattleSquaddie;
    }

    constructor() {
        this.reset();
    }

    addSquaddieTemplate(squaddieTemplate: SquaddieTemplate) {
        if (this.squaddieTemplates[squaddieTemplate.squaddieId.templateId]) {
            throw new Error(`cannot addSquaddieTemplate '${squaddieTemplate.squaddieId.templateId}', is already added`);
        }

        this.squaddieTemplates[squaddieTemplate.squaddieId.templateId] = squaddieTemplate;
    }

    addBattleSquaddie(battleSquaddie: BattleSquaddie) {
        battleSquaddie.assertBattleSquaddie();
        if (!this.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
            throw new Error(`cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with Id '${battleSquaddie.squaddieTemplateId}' exists`);
        }

        if (this.battleSquaddies[battleSquaddie.battleSquaddieId]) {
            throw new Error(`cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', again, it already exists`);
        }

        const squaddieTemplate: SquaddieTemplate = this.squaddieTemplates[battleSquaddie.squaddieTemplateId];
        battleSquaddie.initializeInBattleAttributes(squaddieTemplate.attributes);

        this.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie;
    }

    addSquaddie(squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) {
        this.addSquaddieTemplate(squaddieTemplate);
        this.addBattleSquaddie(battleSquaddie);
    }

    updateBattleSquaddie(battleSquaddie: BattleSquaddie) {
        battleSquaddie.assertBattleSquaddie();
        if (!this.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
            throw new Error(`cannot updateBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with id '${battleSquaddie.squaddieTemplateId}' exists`);
        }

        this.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie;
    }

    getSquaddieByBattleId(battleSquaddieId: string): ResultOrError<{
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }, Error> {
        const battleSquaddie: BattleSquaddie = this.battleSquaddies[battleSquaddieId];
        if (!battleSquaddie) {
            return makeError(new Error(`cannot getBattleSquaddieByID for '${battleSquaddieId}', does not exist`));
        }

        const squaddieTemplate: SquaddieTemplate = this.squaddieTemplates[battleSquaddie.squaddieTemplateId];

        return makeResult({
            squaddieTemplate,
            battleSquaddie,
        });
    }

    getSquaddieTemplateIterator(): { squaddieTemplateId: string, squaddieTemplate: SquaddieTemplate }[] {
        return Object.entries(this.squaddieTemplates).map(([squaddieTemplateId, squaddieTemplate]) => {
            return {
                squaddieTemplate,
                squaddieTemplateId,
            };
        });
    }

    getBattleSquaddieIterator(): { battleSquaddieId: string, battleSquaddie: BattleSquaddie }[] {
        return Object.entries(this.battleSquaddies).map(([battleSquaddieId, battleSquaddie]) => {
            return {
                battleSquaddie,
                battleSquaddieId,
            };
        });
    }

    reset() {
        this.battleSquaddies = {};
        this.squaddieTemplates = {};
        this.imageUIByBattleSquaddieId = {};
    }
}
