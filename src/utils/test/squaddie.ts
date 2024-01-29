import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {ObjectRepository, ObjectRepositoryService} from "../../battle/objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "../../battle/battleSquaddie";
import {SquaddieTurnService} from "../../squaddie/turn";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {ArmyAttributes, DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {ActionTemplate, ActionTemplateService} from "../../decision/actionTemplate";
import {getValidValueOrDefault} from "../validityCheck";

export const SquaddieAndObjectRepositoryService = {
    createNewSquaddieAndAddToRepository: (
        {
            name,
            templateId,
            battleId,
            affiliation,
            squaddieRepository,
            actionEffectSquaddieTemplates,
            actionTemplates,
            attributes,
        }: {
            name: string,
            templateId: string,
            battleId: string,
            affiliation: SquaddieAffiliation,
            squaddieRepository: ObjectRepository,
            actionEffectSquaddieTemplates?: ActionEffectSquaddieTemplate[],
            actionTemplates?: ActionTemplate[],
            attributes?: ArmyAttributes,
        }
    ): {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie,
    } => {
        return CreateNewSquaddieAndAddToRepository({
            name,
            templateId,
            battleId,
            affiliation,
            squaddieRepository,
            TODODELETEMEactions: actionEffectSquaddieTemplates,
            actionTemplates,
            attributes,
        });
    }
};

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieId = (id: string, affiliation: SquaddieAffiliation): SquaddieId => {
    return {
        templateId: id,
        name: id,
        resources: {
            mapIconResourceKey: "",
            actionSpritesByEmotion: {},
        },
        traits: TraitStatusStorageHelper.newUsingTraitValues(),
        affiliation
    };
}

export const CreateNewSquaddieAndAddToRepository: (
    params: {
        name: string,
        templateId: string,
        battleId: string,
        affiliation: SquaddieAffiliation,
        squaddieRepository: ObjectRepository,
        TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
        actionTemplates?: ActionTemplate[],
        attributes?: ArmyAttributes,
    }
) => {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie,
} = ({
         name,
         templateId,
         battleId,
         affiliation,
         squaddieRepository,
         TODODELETEMEactions,
         attributes,
         actionTemplates,
     }: {
         name: string,
         templateId: string,
         battleId: string,
         affiliation: SquaddieAffiliation,
         squaddieRepository: ObjectRepository,
         TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
         actionTemplates?: ActionTemplate[],
         attributes?: ArmyAttributes,
     }
) => {
    const squaddieTemplate: SquaddieTemplate = SquaddieTemplateService.new({
        squaddieId: {
            templateId,
            name,
            resources: {
                mapIconResourceKey: "",
                actionSpritesByEmotion: {},
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            affiliation
        },
        TODODELETEMEactions: TODODELETEMEactions || [],
        actionTemplates: getValidValueOrDefault(actionTemplates, []),
        attributes: attributes || DefaultArmyAttributes(),
    });
    const battleSquaddie = BattleSquaddieService.newBattleSquaddie({
        squaddieTemplateId: templateId,
        battleSquaddieId: battleId,
        squaddieTurn: SquaddieTurnService.new(),
    });
    ObjectRepositoryService.addSquaddie(squaddieRepository, squaddieTemplate, battleSquaddie);

    return {
        squaddieTemplate,
        battleSquaddie,
    }
}

export const CreateNewThiefSquaddie: (
    params: {
        squaddieRepository: ObjectRepository,
        name?: string,
        templateId?: string,
        battleId?: string,
        affiliation?: SquaddieAffiliation,
        TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
        attributes?: ArmyAttributes,
        actionTemplates: ActionTemplate[],
    }
) => {
    thiefSquaddieTemplate: SquaddieTemplate
    thiefBattleSquaddie: BattleSquaddie,
} = ({
         squaddieRepository,
         name,
         templateId,
         battleId,
         affiliation,
         TODODELETEMEactions,
         actionTemplates,
         attributes,
     }: {
         squaddieRepository: ObjectRepository,
         name?: string,
         templateId?: string,
         battleId?: string,
         affiliation?: SquaddieAffiliation,
         TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
         actionTemplates?: ActionTemplate[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
        TODODELETEMEname: "knife",
        TODODELETEMEid: "knife",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        TODODELETEMEactionPointCost: 1,
        damageDescriptions: {
            [DamageType.BODY]: 1,
        },
    });
    const defaultAttackActionTemplate = ActionTemplateService.new({
        name: "knife",
        id: "knife",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        actionPointCost: 1,
        actionEffectTemplates: [defaultAttackActionEffectSquaddieTemplate],
    });

    const {
        squaddieTemplate: thiefSquaddieTemplate,
        battleSquaddie: thiefBattleSquaddie,
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Thief",
        templateId: templateId || "Thief",
        battleId: battleId || "Thief 0",
        affiliation: affiliation && affiliation !== SquaddieAffiliation.UNKNOWN ? affiliation : SquaddieAffiliation.ENEMY,
        squaddieRepository: squaddieRepository,
        TODODELETEMEactions: TODODELETEMEactions || [defaultAttackActionEffectSquaddieTemplate],
        actionTemplates: getValidValueOrDefault(
            actionTemplates,
            [defaultAttackActionTemplate]
        ),
        attributes: attributes || DefaultArmyAttributes(),
    });

    return {
        thiefSquaddieTemplate,
        thiefBattleSquaddie,
    }
}

export const CreateNewKnightSquaddie: (
    params: {
        squaddieRepository: ObjectRepository,
        name?: string,
        templateId?: string,
        battleId?: string,
        affiliation?: SquaddieAffiliation,
        TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
        actionTemplates?: ActionTemplate[],
        attributes?: ArmyAttributes,
    }
) => {
    knightSquaddieTemplate: SquaddieTemplate
    knightBattleSquaddie: BattleSquaddie,
} = ({
         squaddieRepository,
         name,
         templateId,
         battleId,
         affiliation,
         TODODELETEMEactions,
         attributes,
         actionTemplates,
     }: {
         squaddieRepository: ObjectRepository,
         name?: string,
         templateId?: string,
         battleId?: string,
         affiliation?: SquaddieAffiliation,
         TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
         actionTemplates?: ActionTemplate[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackAction = ActionEffectSquaddieTemplateService.new({
        TODODELETEMEname: "longsword",
        TODODELETEMEid: "longsword",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        TODODELETEMEactionPointCost: 1,
        damageDescriptions: {
            [DamageType.BODY]: 2,
        },
    });

    const powerAttackLongswordActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
        TODODELETEMEname: "power attack longsword",
        TODODELETEMEid: "powerAttackLongsword",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        TODODELETEMEactionPointCost: 3,
        damageDescriptions: {
            [DamageType.BODY]: 9001,
        },
    });
    const powerAttackLongswordActionTemplate = ActionTemplateService.new({
        id: "powerAttackLongsword",
        name: "power attack longsword",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        actionPointCost: 3,
        actionEffectTemplates: [powerAttackLongswordActionEffectSquaddieTemplate]
    });

    const {
        squaddieTemplate: knightSquaddieTemplate,
        battleSquaddie: knightBattleSquaddie,
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Knight",
        templateId: templateId || "Knight",
        battleId: battleId || "Knight 0",
        affiliation: affiliation && affiliation !== SquaddieAffiliation.UNKNOWN ? affiliation : SquaddieAffiliation.PLAYER,
        squaddieRepository: squaddieRepository,
        TODODELETEMEactions: TODODELETEMEactions || [defaultAttackAction, powerAttackLongswordActionEffectSquaddieTemplate],
        actionTemplates: getValidValueOrDefault(actionTemplates, [powerAttackLongswordActionTemplate]),
        attributes: attributes || DefaultArmyAttributes(),
    });

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
