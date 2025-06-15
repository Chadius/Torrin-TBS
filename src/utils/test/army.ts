import { PlayerArmy, PlayerArmyService } from "../../campaign/playerArmy"
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
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { SquaddieBuildService } from "../../campaign/squaddieBuild"

export const TestPlayerArmyData = () => {
    const playerArmy: PlayerArmy = PlayerArmyService.new({
        squaddieBuilds: [
            SquaddieBuildService.new({
                squaddieTemplateId: "young_nahla",
            }),
            SquaddieBuildService.new({
                squaddieTemplateId: "sir_camil",
            }),
        ],
    })
    const playerActionTemplates: ActionTemplate[] = [
        ActionTemplateService.new({
            id: "nahla_water_cannon",
            name: "water cannon",
            userReadableDescription: "Attack AC up to 2 tiles away.",
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
            id: "young_nahla_healing_touch",
            name: "healing touch",
            userReadableDescription:
                "Heal 2 HP to yourself or an adjacent ally.",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            ALWAYS_SUCCEEDS: true,
                            HEALING: true,
                        },
                    },
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
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
            userReadableDescription: "Attack AC of an adjacent foe.",
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
    const baseSquaddieTemplatesById: { [k: string]: SquaddieTemplate } = {
        young_nahla: SquaddieTemplateService.new({
            squaddieId: {
                templateId: "young_nahla",
                name: "Nahla",
                resources: {
                    mapIconResourceKey: "map icon young nahla",
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-young-nahla-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-young-nahla-attack",
                        [SquaddieEmotion.TARGETED]:
                            "combat-young-nahla-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-young-nahla-damaged",
                        [SquaddieEmotion.DEAD]: "combat-young-nahla-dead",
                        [SquaddieEmotion.ASSISTING]:
                            "combat-young-nahla-assisting",
                        [SquaddieEmotion.THANKFUL]:
                            "combat-young-nahla-thankful",
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
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                }),
            }),
            actionTemplateIds: [
                "nahla_water_cannon",
                "young_nahla_healing_touch",
            ],
        }),
        sir_camil: SquaddieTemplateService.new({
            attributes: ArmyAttributesService.new({
                maxHitPoints: 5,
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                }),
            }),
            squaddieId: {
                templateId: "sir_camil",
                name: "Sir Camil",
                resources: {
                    mapIconResourceKey: "map icon sir camil",
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-sir-camil-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                        [SquaddieEmotion.TARGETED]: "combat-sir-camil-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-sir-camil-damaged",
                        [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                        [SquaddieEmotion.ASSISTING]:
                            "combat-sir-camil-assisting",
                        [SquaddieEmotion.THANKFUL]: "combat-sir-camil-thankful",
                    },
                },
                traits: TraitStatusStorageService.newUsingTraitValues({
                    [Trait.HUMANOID]: true,
                }),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actionTemplateIds: ["sir_camil_longsword"],
        }),
    }

    return {
        playerArmy,
        playerActionTemplates,
        baseSquaddieTemplatesById,
    }
}
