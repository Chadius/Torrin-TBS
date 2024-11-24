import { PlayerArmy } from "../../campaign/playerArmy"
import { SquaddieEmotion } from "../../battle/animation/actionAnimation/actionAnimationConstants"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import {
    ActionDecisionType,
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"

export const TestArmyPlayerData = () => {
    const playerArmy: PlayerArmy = {
        squaddieTemplates: [
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "player_young_torrin",
                    name: "Torrin",
                    resources: {
                        mapIconResourceKey: "map icon young torrin",
                        actionSpritesByEmotion: {
                            [SquaddieEmotion.NEUTRAL]:
                                "combat-young-torrin-neutral",
                            [SquaddieEmotion.ATTACK]:
                                "combat-young-torrin-attack",
                            [SquaddieEmotion.TARGETED]:
                                "combat-young-torrin-targeted",
                            [SquaddieEmotion.DAMAGED]:
                                "combat-young-torrin-damaged",
                            [SquaddieEmotion.DEAD]: "combat-young-torrin-dead",
                            [SquaddieEmotion.ASSISTING]:
                                "combat-young-torrin-assisting",
                            [SquaddieEmotion.THANKFUL]:
                                "combat-young-torrin-thankful",
                        },
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                        [Trait.MONSU]: true,
                    }),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 3,
                    armorClass: 6,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                    }),
                }),
                actionTemplateIds: [
                    "torrin_water_cannon",
                    "young_torrin_healing_touch",
                ],
            }),
            SquaddieTemplateService.new({
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    armorClass: 8,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                    }),
                }),
                squaddieId: {
                    templateId: "player_sir_camil",
                    name: "Sir Camil",
                    resources: {
                        mapIconResourceKey: "map icon sir camil",
                        actionSpritesByEmotion: {
                            [SquaddieEmotion.NEUTRAL]:
                                "combat-sir-camil-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                            [SquaddieEmotion.TARGETED]:
                                "combat-sir-camil-targeted",
                            [SquaddieEmotion.DAMAGED]:
                                "combat-sir-camil-damaged",
                            [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                            [SquaddieEmotion.ASSISTING]:
                                "combat-sir-camil-assisting",
                            [SquaddieEmotion.THANKFUL]:
                                "combat-sir-camil-thankful",
                        },
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HUMANOID]: true,
                    }),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                actionTemplateIds: ["sir_camil_longsword"],
            }),
        ],
    }
    const playerActionTemplates: ActionTemplate[] = [
        ActionTemplateService.new({
            id: "torrin_water_cannon",
            name: "water cannon",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            ATTACK: true,
                        },
                    },
                    damageDescriptions: {
                        BODY: 2,
                    },
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                    buttonIconResourceKey: "decision-button-bow",
                }),
            ],
            buttonIconResourceKey: "decision-button-bow",
        }),
        ActionTemplateService.new({
            id: "young_torrin_healing_touch",
            name: "healing touch",
            actionPoints: 2,
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            ALWAYS_SUCCEEDS: true,
                            TARGET_ALLY: true,
                            HEALING: true,
                        },
                    },
                    healingDescriptions: {
                        LOST_HIT_POINTS: 2,
                    },
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                }),
            ],
            buttonIconResourceKey: "decision-button-heart",
        }),
        ActionTemplateService.new({
            id: "sir_camil_longsword",
            name: "longsword",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            ATTACK: true,
                        },
                    },
                    damageDescriptions: {
                        BODY: 2,
                    },
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                }),
            ],
            buttonIconResourceKey: "decision-button-sword",
        }),
    ]

    return {
        playerArmy,
        playerActionTemplates,
    }
}
