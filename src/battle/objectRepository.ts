import {BattleSquaddie, BattleSquaddieHelper} from "./battleSquaddie";
import {makeError, makeResult, ResultOrError} from "../utils/ResultOrError";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {ImageUI} from "../ui/imageUI";

export interface ObjectRepository {
    imageUIByBattleSquaddieId: {
        [id: string]: ImageUI;
    };
    squaddieTemplates: {
        [id: string]: SquaddieTemplate;
    };
    battleSquaddies: {
        [id: string]: BattleSquaddie;
    };
}

export const ObjectRepositoryHelper = {
    new: (): ObjectRepository => {
        return {
            imageUIByBattleSquaddieId: {},
            squaddieTemplates: {},
            battleSquaddies: {},
        }
    },
    reset: (repo: ObjectRepository) => {
        reset(repo);
    },
    addSquaddieTemplate: (repo: ObjectRepository, squaddieTemplate: SquaddieTemplate) => {
        addSquaddieTemplate(repo, squaddieTemplate);
    },
    addBattleSquaddie: (repo: ObjectRepository, battleSquaddie: BattleSquaddie) => {
        addBattleSquaddie(repo, battleSquaddie);
    },
    addSquaddie: (repo: ObjectRepository, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) => {
        addSquaddieTemplate(repo, squaddieTemplate);
        addBattleSquaddie(repo, battleSquaddie);
    },
    updateBattleSquaddie: (repo: ObjectRepository, battleSquaddie: BattleSquaddie) => {
        BattleSquaddieHelper.assertBattleSquaddie(battleSquaddie);
        if (!repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
            throw new Error(`cannot updateBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with id '${battleSquaddie.squaddieTemplateId}' exists`);
        }

        repo.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie;
    },
    getSquaddieByBattleId: (repo: ObjectRepository, battleSquaddieId: string): ResultOrError<{
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }, Error> => {
        const battleSquaddie: BattleSquaddie = repo.battleSquaddies[battleSquaddieId];
        if (!battleSquaddie) {
            return makeError(new Error(`cannot getBattleSquaddieByID for '${battleSquaddieId}', does not exist`));
        }

        const squaddieTemplate: SquaddieTemplate = repo.squaddieTemplates[battleSquaddie.squaddieTemplateId];

        return makeResult({
            squaddieTemplate,
            battleSquaddie,
        });
    },
    getSquaddieTemplateIterator: (repo: ObjectRepository): {
        squaddieTemplateId: string,
        squaddieTemplate: SquaddieTemplate
    }[] => {
        return Object.entries(repo.squaddieTemplates).map(([squaddieTemplateId, squaddieTemplate]) => {
            return {
                squaddieTemplate,
                squaddieTemplateId,
            };
        });
    },
    getBattleSquaddieIterator: (repo: ObjectRepository): {
        battleSquaddieId: string,
        battleSquaddie: BattleSquaddie
    }[] => {
        return Object.entries(repo.battleSquaddies).map(([battleSquaddieId, battleSquaddie]) => {
            return {
                battleSquaddie,
                battleSquaddieId,
            };
        });
    },
};

const reset = (repo: ObjectRepository) => {
    repo.imageUIByBattleSquaddieId = {};
    repo.squaddieTemplates = {};
    repo.battleSquaddies = {};
};

const addSquaddieTemplate = (repo: ObjectRepository, squaddieTemplate: SquaddieTemplate) => {
    if (repo.squaddieTemplates[squaddieTemplate.squaddieId.templateId]) {
        throw new Error(`cannot addSquaddieTemplate '${squaddieTemplate.squaddieId.templateId}', is already added`);
    }

    repo.squaddieTemplates[squaddieTemplate.squaddieId.templateId] = squaddieTemplate;
};

const addBattleSquaddie = (repo: ObjectRepository, battleSquaddie: BattleSquaddie) => {
    BattleSquaddieHelper.assertBattleSquaddie(battleSquaddie);
    if (!repo.squaddieTemplates[battleSquaddie.squaddieTemplateId]) {
        throw new Error(`cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', no squaddie template with Id '${battleSquaddie.squaddieTemplateId}' exists`);
    }

    if (repo.battleSquaddies[battleSquaddie.battleSquaddieId]) {
        throw new Error(`cannot addBattleSquaddie '${battleSquaddie.battleSquaddieId}', again, it already exists`);
    }

    const squaddieTemplate: SquaddieTemplate = repo.squaddieTemplates[battleSquaddie.squaddieTemplateId];
    BattleSquaddieHelper.initializeInBattleAttributes(battleSquaddie, squaddieTemplate.attributes);

    repo.battleSquaddies[battleSquaddie.battleSquaddieId] = battleSquaddie;
};
