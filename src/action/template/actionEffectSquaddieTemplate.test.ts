import { DamageType } from "../../squaddie/squaddieService"
import { TargetingShape } from "../../battle/targeting/targetingShapeGenerator"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "./actionEffectSquaddieTemplate"
import { ActionDecisionType } from "./actionTemplate"

describe("ActionEffectSquaddieTemplate", () => {
    it("can be constructed using data object", () => {
        const newAction: ActionEffectSquaddieTemplate =
            ActionEffectSquaddieTemplateService.new({
                damageDescriptions: { [DamageType.SOUL]: 2 },
                healingDescriptions: {},
                minimumRange: 1,
                maximumRange: 4,
                targetingShape: TargetingShape.SNAKE,
                traits: { booleanTraits: { [Trait.ATTACK]: true } },
            })

        expect(newAction.minimumRange).toEqual(1)
        expect(newAction.maximumRange).toEqual(4)
        expect(newAction.targetingShape).toEqual(TargetingShape.SNAKE)
        expect(newAction.damageDescriptions).toEqual({ [DamageType.SOUL]: 2 })
        expect(newAction.healingDescriptions).toEqual({})
        expect(newAction.traits).toEqual(
            TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        )
    })

    it("uses the traits to determine if it targets foes", () => {
        const harmfulAttack = ActionEffectSquaddieTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGETS_FOE]: true,
            }),
        })
        expect(
            ActionEffectSquaddieTemplateService.doesItTargetFriends(
                harmfulAttack
            )
        ).toBeFalsy()
        expect(
            ActionEffectSquaddieTemplateService.doesItTargetFoes(harmfulAttack)
        ).toBeTruthy()
    })
    it("uses the traits to determine if it is Helpful", () => {
        const helpfulAttack = ActionEffectSquaddieTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.HEALING]: true,
                [Trait.TARGETS_ALLY]: true,
            }),
        })
        expect(
            ActionEffectSquaddieTemplateService.doesItTargetFriends(
                helpfulAttack
            )
        ).toBeTruthy()
        expect(
            ActionEffectSquaddieTemplateService.doesItTargetFoes(helpfulAttack)
        ).toBeFalsy()
    })

    describe("sanitize", () => {
        it("can be sanitized to fill in missing fields", () => {
            const actionWithMissingFields =
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: undefined,
                    maximumRange: undefined,
                    traits: undefined,
                    targetingShape: undefined,
                    healingDescriptions: undefined,
                    damageDescriptions: undefined,
                })

            ActionEffectSquaddieTemplateService.sanitize(
                actionWithMissingFields
            )

            expect(actionWithMissingFields.minimumRange).toEqual(0)
            expect(actionWithMissingFields.maximumRange).toEqual(0)
            expect(actionWithMissingFields.targetingShape).toEqual(
                TargetingShape.SNAKE
            )
            expect(actionWithMissingFields.traits).toEqual(
                TraitStatusStorageService.newUsingTraitValues({})
            )
            expect(actionWithMissingFields.damageDescriptions).toEqual({})
            expect(actionWithMissingFields.healingDescriptions).toEqual({})
        })
        it("throws an error if non integer minimum range is used", () => {
            const shouldThrowError = () => {
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 0.2,
                    maximumRange: 3,
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow(Error)
            expect(() => {
                shouldThrowError()
            }).toThrow("Value must be an integer: 0.2")
        })
        it("throws an error if non integer maximum range is used", () => {
            const shouldThrowError = () => {
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 2,
                    maximumRange: 0.3,
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow(Error)
            expect(() => {
                shouldThrowError()
            }).toThrow("Value must be an integer: 0.3")
        })
        it("will throw an error during sanitization if minimum range is more than maximum range", () => {
            const throwErrorBecauseOfRangeIsInvalid = () => {
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 2,
                    maximumRange: 1,
                })
            }

            expect(throwErrorBecauseOfRangeIsInvalid).toThrowError(
                "cannot sanitize"
            )
        })
    })

    describe("can contribute to Multiple Attack Penalty", () => {
        it("does contribute by default if it is an attack", () => {
            const attack: ActionEffectSquaddieTemplate =
                ActionEffectSquaddieTemplateService.new({
                    traits: { booleanTraits: { [Trait.ATTACK]: true } },
                })
            expect(
                ActionEffectSquaddieTemplateService.getMultipleAttackPenalty(
                    attack
                )
            ).toEqual(1)
        })
        it("does not contribute if is not an attack", () => {
            const heal: ActionEffectSquaddieTemplate =
                ActionEffectSquaddieTemplateService.new({})
            expect(
                ActionEffectSquaddieTemplateService.getMultipleAttackPenalty(
                    heal
                )
            ).toEqual(0)
        })
        it("does not contribute if the trait says it does not", () => {
            const quickAttack: ActionEffectSquaddieTemplate =
                ActionEffectSquaddieTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                            [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                        },
                    },
                })
            expect(
                ActionEffectSquaddieTemplateService.getMultipleAttackPenalty(
                    quickAttack
                )
            ).toEqual(0)
        })
    })

    describe("actor decisions", () => {
        it("defaults to choosing a target squaddie", () => {
            const template = ActionEffectSquaddieTemplateService.new({})
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.TARGET_SQUADDIE,
            ])
        })
        it("can specify other types of decisions", () => {
            const template = ActionEffectSquaddieTemplateService.new({
                actionDecisions: [ActionDecisionType.ACTION_SELECTION],
            })
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.ACTION_SELECTION,
            ])
        })
    })
})
