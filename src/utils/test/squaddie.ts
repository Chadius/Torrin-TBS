import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieResource} from "../../squaddie/resource";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {BattleSquaddie} from "../../battle/battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {SquaddieAction} from "../../squaddie/action";
import {ArmyAttributes, DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import * as mocks from "./mocks";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieId = (id: string, affiliation: SquaddieAffiliation) => {
    return new SquaddieId({
        templateId: id,
        name: id,
        resources: new SquaddieResource({}),
        traits: new TraitStatusStorage({}),
        affiliation
    });
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
    const squaddieTemplate = new SquaddieTemplate({
        squaddieId: new SquaddieId({
            templateId,
            name,
            resources: new SquaddieResource({}),
            traits: new TraitStatusStorage({}),
            affiliation
        }),
        actions: actions,
        attributes,
    });
    const battleSquaddie = new BattleSquaddie({
        squaddieTemplateId: templateId,
        battleSquaddieId: battleId,
        squaddieTurn: new SquaddieTurn({}),
        mapIcon: mocks.mockImageUI(),
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

    const defaultAttackAction = new SquaddieAction({
        name: "knife",
        id: "knife",
        traits: new TraitStatusStorage({
            initialTraitValues: {
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.TARGETS_FOE]: true,
            }
        }).filterCategory(TraitCategory.ACTION),
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

    const defaultAttackAction = new SquaddieAction({
        name: "longsword",
        id: "longsword",
        traits: new TraitStatusStorage({
            initialTraitValues: {
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.TARGETS_FOE]: true,
            }
        }).filterCategory(TraitCategory.ACTION),
        minimumRange: 1,
        maximumRange: 1,
        actionPointCost: 1,
        damageDescriptions: {
            [DamageType.Body]: 2,
        },
    });

    const powerAttacklongswordAction = new SquaddieAction({
        name: "power attack longsword",
        id: "powerAttackLongsword",
        traits: new TraitStatusStorage({
            initialTraitValues: {
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.TARGETS_FOE]: true,
            }
        }).filterCategory(TraitCategory.ACTION),
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
        actions: actions || [defaultAttackAction, powerAttacklongswordAction],
        attributes: attributes || DefaultArmyAttributes(),
    });

    return {
        knightSquaddieTemplate,
        knightBattleSquaddie,
    }
}
