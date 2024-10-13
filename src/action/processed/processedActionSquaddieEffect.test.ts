import {
    ProcessedActionSquaddieEffect,
    ProcessedActionSquaddieEffectService,
} from "./processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../decided/decidedActionSquaddieEffect"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../battle/actionDecision/battleActionDecisionStep"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../battle/history/battleAction/battleActionSquaddieChange"
import { DegreeOfSuccess } from "../../battle/calculator/actionCalculator/degreeOfSuccess"
import { InBattleAttributesService } from "../../battle/stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../squaddie/attributeModifier"
import { ActionTemplateService } from "../template/actionTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { SquaddieSquaddieResultsService } from "../../battle/history/squaddieSquaddieResults"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"
import { BattleActionActionContextService } from "../../battle/history/battleAction/battleActionActionContext"

describe("Processed Action Squaddie Effect", () => {
    it("will set results to undefined if it is not provided", () => {
        const effect =
            ProcessedActionSquaddieEffectService.newFromDecidedActionEffect({
                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                    template: ActionEffectSquaddieTemplateService.new({}),
                    target: { q: 0, r: 0 },
                }),
            })

        expect(effect.results).toBeUndefined()
    })
    describe("getMultipleAttackPenalty", () => {
        it("does contribute by default if it has an attack", () => {
            const attack =
                ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                    {
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                template:
                                    ActionEffectSquaddieTemplateService.new({
                                        traits: {
                                            booleanTraits: {
                                                [Trait.ATTACK]: true,
                                            },
                                        },
                                    }),
                            }),
                    }
                )

            expect(
                ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(
                    attack
                )
            ).toEqual(1)
        })
        it("does not contribute if is not an attack", () => {
            const heal =
                ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                    {
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                template:
                                    ActionEffectSquaddieTemplateService.new({}),
                            }),
                    }
                )
            expect(
                ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(
                    heal
                )
            ).toEqual(0)
        })
        it("does not contribute if the trait says it does not", () => {
            const quickAttack =
                ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                    {
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                template:
                                    ActionEffectSquaddieTemplateService.new({
                                        traits: {
                                            booleanTraits: {
                                                [Trait.ATTACK]: true,
                                                [Trait.NO_MULTIPLE_ATTACK_PENALTY]:
                                                    true,
                                            },
                                        },
                                    }),
                            }),
                    }
                )
            expect(
                ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(
                    quickAttack
                )
            ).toEqual(0)
        })
    })

    it("converts from BattleActionDecisionStep and BattleSquaddieChange", () => {
        const objectRepository: ObjectRepository = ObjectRepositoryService.new()

        const longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.VERSUS_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
        })

        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordAction
        )

        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: "battleSquaddieId",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: longswordAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetLocation: { q: 0, r: 1 },
        })

        const battleActionSquaddieChange =
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: "target",
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageExplanation: DamageExplanationService.new({
                    net: 2,
                }),
                healingReceived: 1,
                attributesBefore: InBattleAttributesService.new({
                    currentHitPoints: 3,
                    attributeModifiers: [
                        AttributeModifierService.new({
                            type: AttributeType.ARMOR,
                            source: AttributeSource.ITEM,
                            amount: 1,
                        }),
                    ],
                }),
                attributesAfter: InBattleAttributesService.new({
                    currentHitPoints: 2,
                    attributeModifiers: [
                        AttributeModifierService.new({
                            type: AttributeType.ARMOR,
                            source: AttributeSource.ITEM,
                            amount: 3,
                        }),
                    ],
                }),
            })

        const actualEffect: ProcessedActionSquaddieEffect =
            ProcessedActionSquaddieEffectService.new({
                battleActionDecisionStep: actionStep,
                battleActionSquaddieChange: battleActionSquaddieChange,
                objectRepository,
            })

        const expectedEffect: ProcessedActionSquaddieEffect =
            ProcessedActionSquaddieEffectService.newFromDecidedActionEffect({
                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                    target: { q: 0, r: 1 },
                    template: longswordAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                }),
                results: SquaddieSquaddieResultsService.new({
                    actingBattleSquaddieId: "battleSquaddieId",
                    squaddieChanges: [battleActionSquaddieChange],
                    targetedBattleSquaddieIds: ["target"],
                    actionContext: BattleActionActionContextService.new({}),
                }),
            })
        expect(actualEffect).toEqual(expectedEffect)
    })
})
