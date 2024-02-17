import {PlayerArmy} from "../../campaign/playerArmy";
import {SquaddieEmotion} from "../../battle/animation/actionAnimation/actionAnimationConstants";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {ActionTemplateService} from "../../action/template/actionTemplate";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";

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
                            [SquaddieEmotion.ASSISTING]: "combat-young-torrin-assisting",
                            [SquaddieEmotion.THANKFUL]: "combat-young-torrin-thankful",
                        },
                    },
                    "traits": TraitStatusStorageService.newUsingTraitValues({
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
                        "traits": TraitStatusStorageService.newUsingTraitValues(),
                    }),
                },
                "actionTemplates": [
                    ActionTemplateService.new({
                        "name": "water cannon",
                        "id": "torrin_water_cannon",
                        "actionEffectTemplates": [
                            ActionEffectSquaddieTemplateService.new({
                                "minimumRange": 0,
                                "maximumRange": 2,
                                "traits": {
                                    "booleanTraits": {
                                        "ATTACK": true
                                    }
                                },
                                "damageDescriptions": {
                                    "BODY": 2
                                }
                            })
                        ]
                    }),
                    ActionTemplateService.new({
                        "name": "healing touch",
                        "id": "young_torrin_healing_touch",
                        "actionPoints": 2,
                        "actionEffectTemplates": [
                            ActionEffectSquaddieTemplateService.new({
                                "minimumRange": 0,
                                "maximumRange": 1,
                                "traits": {
                                    "booleanTraits": {
                                        "ALWAYS_SUCCEEDS": true,
                                        "TARGETS_ALLIES": true,
                                        "HEALING": true
                                    }
                                },
                                "healingDescriptions": {
                                    "LOST_HIT_POINTS": 2
                                }
                            })
                        ]
                    })
                ],
            },
            {
                attributes: {
                    maxHitPoints: 5,
                    armorClass: 8,
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues(),
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
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                    }),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                "actionTemplates": [
                    ActionTemplateService.new({
                        "name": "longsword",
                        "id": "sir_camil_longsword",
                        "actionEffectTemplates": [
                            ActionEffectSquaddieTemplateService.new({
                                "minimumRange": 0,
                                "maximumRange": 1,
                                "traits": {
                                    "booleanTraits": {
                                        "ATTACK": true
                                    }
                                },
                                "damageDescriptions": {
                                    "BODY": 2
                                }
                            })
                        ]
                    })
                ],
            },
        ]
    };

    return {
        playerArmy
    }
}
