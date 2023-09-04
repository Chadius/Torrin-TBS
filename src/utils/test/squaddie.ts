import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieResource} from "../../squaddie/resource";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battle/battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {SquaddieActivity} from "../../squaddie/activity";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import * as mocks from "./mocks";
import {DamageType} from "../../squaddie/squaddieService";

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieId = (id: string, affiliation: SquaddieAffiliation) => {
    return new SquaddieId({
        staticId: id,
        name: id,
        resources: new SquaddieResource({}),
        traits: new TraitStatusStorage(),
        affiliation
    });
}

export const CreateNewSquaddieAndAddToRepository: (
    params: {
        name: string,
        staticId: string,
        dynamicId: string,
        affiliation: SquaddieAffiliation,
        squaddieRepository: BattleSquaddieRepository,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }
) => {
    staticSquaddie: BattleSquaddieStatic
    dynamicSquaddie: BattleSquaddieDynamic,
} = ({
         name,
         staticId,
         dynamicId,
         affiliation,
         squaddieRepository,
         activities,
         attributes,
     }: {
         name: string,
         staticId: string,
         dynamicId: string,
         affiliation: SquaddieAffiliation,
         squaddieRepository: BattleSquaddieRepository,
         activities?: SquaddieActivity[],
         attributes?: ArmyAttributes,
     }
) => {
    const staticSquaddie = new BattleSquaddieStatic({
        squaddieId: new SquaddieId({
            staticId,
            name,
            resources: new SquaddieResource({}),
            traits: new TraitStatusStorage(),
            affiliation
        }),
        activities,
        attributes,
    });
    const dynamicSquaddie = new BattleSquaddieDynamic({
        staticSquaddieId: staticId,
        dynamicSquaddieId: dynamicId,
        squaddieTurn: new SquaddieTurn(),
        mapIcon: mocks.mockImageUI(),
    });
    squaddieRepository.addSquaddie(staticSquaddie, dynamicSquaddie);

    return {
        staticSquaddie,
        dynamicSquaddie,
    }
}

export const CreateNewThiefSquaddie: (
    params: {
        squaddieRepository: BattleSquaddieRepository,
        name?: string,
        staticId?: string,
        dynamicId?: string,
        affiliation?: SquaddieAffiliation,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }
) => {
    thiefStaticSquaddie: BattleSquaddieStatic
    thiefDynamicSquaddie: BattleSquaddieDynamic,
} = ({
         squaddieRepository,
         name,
         staticId,
         dynamicId,
         affiliation,
         activities,
         attributes,
     }: {
         squaddieRepository: BattleSquaddieRepository,
         name?: string,
         staticId?: string,
         dynamicId?: string,
         affiliation?: SquaddieAffiliation,
         activities?: SquaddieActivity[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackActivity = new SquaddieActivity({
        name: "knife",
        id: "knife",
        traits: new TraitStatusStorage({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }).filterCategory(TraitCategory.ACTIVITY),
        minimumRange: 1,
        maximumRange: 1,
        actionsToSpend: 1,
        damageDescriptions: {
            [DamageType.Body]: 1,
        },
    });

    const {
        staticSquaddie: thiefStaticSquaddie,
        dynamicSquaddie: thiefDynamicSquaddie,
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Thief",
        staticId: staticId || "Thief",
        dynamicId: dynamicId || "Thief 0",
        affiliation: affiliation && affiliation !== SquaddieAffiliation.UNKNOWN ? affiliation : SquaddieAffiliation.ENEMY,
        squaddieRepository: squaddieRepository,
        activities: activities || [defaultAttackActivity],
        attributes: attributes || new ArmyAttributes({
            maxHitPoints: 5,
        })
    });

    return {
        thiefStaticSquaddie,
        thiefDynamicSquaddie,
    }
}

export const CreateNewKnightSquaddie: (
    params: {
        squaddieRepository: BattleSquaddieRepository,
        name?: string,
        staticId?: string,
        dynamicId?: string,
        affiliation?: SquaddieAffiliation,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }
) => {
    knightStaticSquaddie: BattleSquaddieStatic
    knightDynamicSquaddie: BattleSquaddieDynamic,
} = ({
         squaddieRepository,
         name,
         staticId,
         dynamicId,
         affiliation,
         activities,
         attributes,
     }: {
         squaddieRepository: BattleSquaddieRepository,
         name?: string,
         staticId?: string,
         dynamicId?: string,
         affiliation?: SquaddieAffiliation,
         activities?: SquaddieActivity[],
         attributes?: ArmyAttributes,
     }
) => {

    const defaultAttackActivity = new SquaddieActivity({
        name: "longsword",
        id: "longsword",
        traits: new TraitStatusStorage({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }).filterCategory(TraitCategory.ACTIVITY),
        minimumRange: 1,
        maximumRange: 1,
        actionsToSpend: 1,
        damageDescriptions: {
            [DamageType.Body]: 2,
        },
    });

    const powerAttackLongswordActivity = new SquaddieActivity({
        name: "power attack longsword",
        id: "powerAttackLongsword",
        traits: new TraitStatusStorage({
            [Trait.ATTACK]: true,
            [Trait.TARGET_ARMOR]: true,
            [Trait.TARGETS_FOE]: true,
        }).filterCategory(TraitCategory.ACTIVITY),
        minimumRange: 1,
        maximumRange: 1,
        actionsToSpend: 3,
        damageDescriptions: {
            [DamageType.Body]: 9001,
        },
    });

    const {
        staticSquaddie: knightStaticSquaddie,
        dynamicSquaddie: knightDynamicSquaddie,
    } = CreateNewSquaddieAndAddToRepository({
        name: name || "Knight",
        staticId: staticId || "Knight",
        dynamicId: dynamicId || "Knight 0",
        affiliation: affiliation && affiliation !== SquaddieAffiliation.UNKNOWN ? affiliation : SquaddieAffiliation.PLAYER,
        squaddieRepository: squaddieRepository,
        activities: activities || [defaultAttackActivity, powerAttackLongswordActivity],
        attributes: attributes || new ArmyAttributes({
            maxHitPoints: 5,
        })
    });

    return {
        knightStaticSquaddie,
        knightDynamicSquaddie,
    }
}
