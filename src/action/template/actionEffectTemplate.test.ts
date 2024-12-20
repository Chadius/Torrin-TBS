import { DamageType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "./actionEffectTemplate"
import { ActionDecisionType } from "./actionTemplate"
import { describe, expect, it } from "vitest"

describe("ActionEffectTemplate", () => {
    it("can be constructed using data object", () => {
        const newAction: ActionEffectTemplate = ActionEffectTemplateService.new(
            {
                damageDescriptions: { [DamageType.SOUL]: 2 },
                healingDescriptions: {},
                traits: { booleanTraits: { [Trait.ATTACK]: true } },
            }
        )

        expect(newAction.damageDescriptions).toEqual({ [DamageType.SOUL]: 2 })
        expect(newAction.healingDescriptions).toEqual({})
        expect(newAction.traits).toEqual(
            TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        )
    })

    it("uses the traits to determine if it targets foes", () => {
        const harmfulAttack = ActionEffectTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_FOE]: true,
            }),
        })
        expect(
            ActionEffectTemplateService.doesItTargetFriends(harmfulAttack)
        ).toBeFalsy()
        expect(
            ActionEffectTemplateService.doesItTargetFoes(harmfulAttack)
        ).toBeTruthy()
    })
    it("uses the traits to determine if it is Helpful", () => {
        const helpfulAttack = ActionEffectTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.HEALING]: true,
                [Trait.TARGET_ALLY]: true,
            }),
        })
        expect(
            ActionEffectTemplateService.doesItTargetFriends(helpfulAttack)
        ).toBeTruthy()
        expect(
            ActionEffectTemplateService.doesItTargetFoes(helpfulAttack)
        ).toBeFalsy()
    })

    describe("sanitize", () => {
        it("can be sanitized to fill in missing fields", () => {
            const actionWithMissingFields = ActionEffectTemplateService.new({
                traits: undefined,
                healingDescriptions: undefined,
                damageDescriptions: undefined,
            })

            ActionEffectTemplateService.sanitize(actionWithMissingFields)

            expect(actionWithMissingFields.traits).toEqual(
                TraitStatusStorageService.newUsingTraitValues({})
            )
            expect(actionWithMissingFields.damageDescriptions).toEqual({})
            expect(actionWithMissingFields.healingDescriptions).toEqual({})
        })
    })

    describe("can contribute to Multiple Attack Penalty", () => {
        it("does contribute by default if it is an attack", () => {
            const attack: ActionEffectTemplate =
                ActionEffectTemplateService.new({
                    traits: { booleanTraits: { [Trait.ATTACK]: true } },
                })
            expect(
                ActionEffectTemplateService.getMultipleAttackPenalty(attack)
            ).toEqual(1)
        })
        it("does not contribute if is not an attack", () => {
            const heal: ActionEffectTemplate = ActionEffectTemplateService.new(
                {}
            )
            expect(
                ActionEffectTemplateService.getMultipleAttackPenalty(heal)
            ).toEqual(0)
        })
        it("does not contribute if the trait says it does not", () => {
            const quickAttack: ActionEffectTemplate =
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                            [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                        },
                    },
                })
            expect(
                ActionEffectTemplateService.getMultipleAttackPenalty(
                    quickAttack
                )
            ).toEqual(0)
        })
    })

    describe("actor decisions", () => {
        it("defaults to choosing a target squaddie", () => {
            const template = ActionEffectTemplateService.new({})
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.TARGET_SQUADDIE,
            ])
        })
        it("can specify other types of decisions", () => {
            const template = ActionEffectTemplateService.new({
                actionDecisions: [ActionDecisionType.ACTION_SELECTION],
            })
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.ACTION_SELECTION,
            ])
        })
    })
})
