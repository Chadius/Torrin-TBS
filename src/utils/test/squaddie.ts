import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {BattleSquaddie, BattleSquaddieHelper} from "../../battle/battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {ArmyAttributes, DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
        squaddieRepository: BattleSquaddieRepository,
        actions?: SquaddieAction[],
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
         actions,
         attributes,
     }: {
         name: string,
         templateId: string,
         battleId: string,
         affiliation: SquaddieAffiliation,
         squaddieRepository: BattleSquaddieRepository,
         actions?: SquaddieAction[],
         attributes?: ArmyAttributes,
     }
) => {
    const squaddieTemplate: SquaddieTemplate = {
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
        actions: actions || [],
        attributes: attributes || DefaultArmyAttributes(),
    };
    const battleSquaddie = BattleSquaddieHelper.newBattleSquaddie({
        squaddieTemplateId: templateId,
        battleSquaddieId: battleId,
        squaddieTurn: SquaddieTurnHandler.new(),
    });
    squaddieRepository.addSquaddie(squaddieTemplate, battleSquaddie);

    return {
        squaddieTemplate,
        battleSquaddie,
    }
}

export const CreateNewThiefSquaddie: (
    params: {
        squaddieRepository: BattleSquaddieRepository,
        name?: string,
        templateId?: string,
        battleId?: string,
        affiliation?: SquaddieAffiliation,
        actions?: SquaddieAction[],
        attributes?: ArmyAttributes,
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
         actions,
         attributes,
     }: {
         squaddieRepository: BattleSquaddieRepository,
         name?: string,
         templateId?: string,
         battleId?: string,
         affiliation?: SquaddieAffiliation,
         actions?: SquaddieAction[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackAction = SquaddieActionHandler.new({
        name: "knife",
        id: "knife",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        actionPointCost: 1,
        damageDescriptions: {
            [DamageType.Body]: 1,
        },
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
        actions: actions || [defaultAttackAction],
        attributes: attributes || DefaultArmyAttributes(),
    });

    return {
        thiefSquaddieTemplate,
        thiefBattleSquaddie,
    }
}

export const CreateNewKnightSquaddie: (
    params: {
        squaddieRepository: BattleSquaddieRepository,
        name?: string,
        templateId?: string,
        battleId?: string,
        affiliation?: SquaddieAffiliation,
        actions?: SquaddieAction[],
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
         actions,
         attributes,
     }: {
         squaddieRepository: BattleSquaddieRepository,
         name?: string,
         templateId?: string,
         battleId?: string,
         affiliation?: SquaddieAffiliation,
         actions?: SquaddieAction[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackAction = SquaddieActionHandler.new({
        name: "longsword",
        id: "longsword",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        actionPointCost: 1,
        damageDescriptions: {
            [DamageType.Body]: 2,
        },
    });

    const powerAttackLongswordAction = SquaddieActionHandler.new({
        name: "power attack longsword",
        id: "powerAttackLongsword",
        traits: TraitStatusStorageHelper.newUsingTraitValues({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }),
        minimumRange: 1,
        maximumRange: 1,
        actionPointCost: 3,
        damageDescriptions: {
            [DamageType.Body]: 9001,
        },
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
        actions: actions || [defaultAttackAction, powerAttackLongswordAction],
        attributes: attributes || DefaultArmyAttributes(),
    });

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
