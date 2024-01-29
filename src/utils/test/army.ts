import {PlayerArmy} from "../../campaign/playerArmy";
import {SquaddieEmotion} from "../../battle/animation/actionAnimation/actionAnimationConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {ActionTemplateService} from "../../decision/actionTemplate";
import {SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {ActionEffectType} from "../../decision/actionEffect";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

export const TestArmyPlayerData = () => {
    const playerArmy: PlayerArmy = {
        "squaddieTemplates": [
            SquaddieTemplateService.new({
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
                            [SquaddieEmotion.ASSISTING]: "combat-young-torrin-assisting",
                            [SquaddieEmotion.THANKFUL]: "combat-young-torrin-thankful",
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
                "actionTemplates": [
                    {
                        "id": "torrin_water_cannon",
                        "name": "water cannon",
                        "actionPointCost": 1,
                        "traits": TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        "actionEffectTemplates": [
                            {
                                type: ActionEffectType.SQUADDIE,
                                TODODELETEMEactionPointCost: 1,
                                targetingShape: TargetingShape.SNAKE,
                                healingDescriptions: {},
                                TODODELETEMEname: "water cannon",
                                TODODELETEMEid: "torrin_water_cannon",
                                minimumRange: 0,
                                maximumRange: 2,
                                traits: TraitStatusStorageHelper.newUsingTraitValues({
                                    [Trait.ATTACK]: true,
                                }),
                                damageDescriptions: {
                                    [DamageType.BODY]: 2
                                }
                            },
                        ]
                    },
                    {
                        "id": "young_torrin_healing_touch",
                        "name": "healing touch",
                        "actionPointCost": 2,
                        "traits": TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.SKIP_ANIMATION]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                            [Trait.TARGETS_ALLIES]: true,
                            [Trait.HEALING]: true,
                        }),
                        "actionEffectTemplates": [
                            {
                                type: ActionEffectType.SQUADDIE,
                                damageDescriptions: {},
                                targetingShape: TargetingShape.SNAKE,
                                TODODELETEMEname: "healing touch",
                                TODODELETEMEid: "young_torrin_healing_touch",
                                minimumRange: 0,
                                maximumRange: 1,
                                traits: TraitStatusStorageHelper.newUsingTraitValues({
                                    [Trait.SKIP_ANIMATION]: true,
                                    [Trait.ALWAYS_SUCCEEDS]: true,
                                    [Trait.TARGETS_ALLIES]: true,
                                    [Trait.HEALING]: true,
                                }),
                                TODODELETEMEactionPointCost: 2,
                                healingDescriptions: {[HealingType.LOST_HIT_POINTS]: 2}
                            },
                        ]
                    },
                ],
            }),
            SquaddieTemplateService.new({
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
                            [SquaddieEmotion.ASSISTING]: "combat-sir-camil-assisting",
                            [SquaddieEmotion.THANKFUL]: "combat-sir-camil-thankful",
                        },
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                    }),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                actionTemplates: [
                    ActionTemplateService.new({
                        id: "sir_camil_longsword",
                        name: "longsword",
                        traits: TraitStatusStorageHelper.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                        actionEffectTemplates: [
                            ActionEffectSquaddieTemplateService.new({
                                TODODELETEMEname: "longsword",
                                TODODELETEMEid: "sir_camil_longsword",
                                minimumRange: 0,
                                maximumRange: 1,
                                traits: TraitStatusStorageHelper.newUsingTraitValues({
                                    [Trait.ATTACK]: true,
                                }),
                                damageDescriptions: {
                                    [DamageType.BODY]: 2
                                }
                            })
                        ]
                    }),
                ],
            }),
        ]
    };

    return {
        playerArmy
    }
}
