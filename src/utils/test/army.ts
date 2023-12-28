import {PlayerArmy} from "../../campaign/playerArmy";
import {SquaddieEmotion} from "../../battle/animation/actionAnimation/actionAnimationConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {SquaddieSquaddieActionService} from "../../squaddie/action";
import {DamageType, HealingType} from "../../squaddie/squaddieService";

export const TestArmyPlayerData = () => {
    const playerArmy: PlayerArmy = {
        "squaddieTemplates": [
            {
                "squaddieId": {
                    "templateId": "player_young_torrin",
                    "name": "Torrin",
                    "resources": {
                        "mapIconResourceKey": "map icon young torrin",
                        "actionSpritesByEmotion": {
                            [SquaddieEmotion.NEUTRAL]: "combat-young-torrin-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-young-torrin-attack",
                            [SquaddieEmotion.TARGETED]: "combat-young-torrin-targeted",
                            [SquaddieEmotion.DAMAGED]: "combat-young-torrin-damaged",
                            [SquaddieEmotion.DEAD]: "combat-young-torrin-dead",
                        },
                    },
                    "traits": TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                        [Trait.MONSU]: true
                    }),
                    "affiliation": SquaddieAffiliation.PLAYER,
                },
                "attributes": {
                    "maxHitPoints": 3,
                    "armorClass": 6,
                    "movement": CreateNewSquaddieMovementWithTraits({
                        "movementPerAction": 2,
                        "traits": TraitStatusStorageHelper.newUsingTraitValues(),
                    }),
                },
                "actions": [
                    SquaddieSquaddieActionService.new({
                        name: "water cannon",
                        id: "torrin_water_cannon",
                        minimumRange: 0,
                        maximumRange: 2,
                        traits: TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        damageDescriptions: {
                            [DamageType.BODY]: 2
                        }
                    }),
                    SquaddieSquaddieActionService.new({
                        name: "healing touch",
                        id: "young_torrin_healing_touch",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.SKIP_ANIMATION]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                            [Trait.TARGETS_ALLIES]: true,
                            [Trait.HEALING]: true,
                        }),
                        actionPointCost: 2,
                        healingDescriptions: {[HealingType.LOST_HIT_POINTS]: 2}
                    })
                ],
            },
            {
                attributes: {
                    maxHitPoints: 5,
                    armorClass: 8,
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 2,
                        traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    }),
                },
                squaddieId: {
                    templateId: "player_sir_camil",
                    name: "Sir Camil",
                    resources: {
                        mapIconResourceKey: "map icon sir camil",
                        actionSpritesByEmotion: {
                            [SquaddieEmotion.NEUTRAL]: "combat-sir-camil-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                            [SquaddieEmotion.TARGETED]: "combat-sir-camil-targeted",
                            [SquaddieEmotion.DAMAGED]: "combat-sir-camil-damaged",
                            [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                        },
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                    }),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                actions: [
                    SquaddieSquaddieActionService.new({
                        name: "longsword",
                        id: "sir_camil_longsword",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        damageDescriptions: {
                            [DamageType.BODY]: 2
                        }
                    })
                ],
            },
        ]
    };

    return {
        playerArmy
    }
}
