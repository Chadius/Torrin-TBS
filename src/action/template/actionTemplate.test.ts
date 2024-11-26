import { ActionDecisionType, ActionTemplateService } from "./actionTemplate"
import { ActionEffectTemplateService } from "./actionEffectTemplate"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { TargetingShape } from "../../battle/targeting/targetingShapeGenerator"
import { TargetConstraintsService } from "../targetConstraints"

describe("ActionTemplate", () => {
    it("can create a template with defaults and required fields", () => {
        const justMovement = ActionTemplateService.new({
            id: "Move it",
            name: "Move",
        })

        expect(justMovement.id).toEqual("Move it")
        expect(justMovement.name).toEqual("Move")
        expect(justMovement.actionEffectTemplates).toHaveLength(0)
        expect(justMovement.resourceCost.actionPoints).toEqual(1)
        expect(justMovement.rank).toEqual(0)
        expect(justMovement.targetConstraints.minimumRange).toEqual(0)
        expect(justMovement.targetConstraints.maximumRange).toEqual(0)
        expect(justMovement.targetConstraints.targetingShape).toEqual(
            TargetingShape.SNAKE
        )
    })

    it("can create a template with new action effects", () => {
        const attackTemplate = ActionEffectTemplateService.new({
            damageDescriptions: { [DamageType.BODY]: 2 },
            healingDescriptions: {},
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
            }),
        })

        const justMovement = ActionTemplateService.new({
            id: "strike",
            name: "strike",
            actionEffectTemplates: [attackTemplate],
        })

        expect(justMovement.actionEffectTemplates).toHaveLength(1)
        expect(justMovement.actionEffectTemplates[0]).toEqual(attackTemplate)
    })

    describe("Range", () => {
        it("can create a template with a given range", () => {
            const actionTemplate = ActionTemplateService.new({
                id: "strike",
                name: "strike",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 1,
                    maximumRange: 10,
                    targetingShape: TargetingShape.SNAKE,
                }),
            })
            expect(actionTemplate.targetConstraints.minimumRange).toEqual(1)
            expect(actionTemplate.targetConstraints.maximumRange).toEqual(10)
            expect(actionTemplate.targetConstraints.targetingShape).toEqual(
                TargetingShape.SNAKE
            )
        })
    })

    it("will throw an error if the template has no name", () => {
        const throwErrorBecauseOfNoName = () => {
            ActionTemplateService.new({
                id: "action Id",
                name: undefined,
            })
        }

        expect(throwErrorBecauseOfNoName).toThrowError("cannot sanitize")
    })

    it("will throw an error if the template has no id", () => {
        const throwErrorBecauseOfNoId = () => {
            ActionTemplateService.new({
                id: undefined,
                name: "Wow cool name",
            })
        }

        expect(throwErrorBecauseOfNoId).toThrowError("cannot sanitize")
    })

    it("can describe the damage and heal totals", () => {
        const actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "actionTemplate",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    damageDescriptions: {
                        [DamageType.BODY]: 3,
                        [DamageType.SOUL]: 1,
                    },
                }),
                ActionEffectTemplateService.new({
                    damageDescriptions: {
                        [DamageType.MIND]: 2,
                    },
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 4,
                    },
                }),
            ],
        })

        expect(ActionTemplateService.getTotalDamage(actionTemplate)).toEqual(6)
        expect(ActionTemplateService.getTotalHealing(actionTemplate)).toEqual(4)
    })

    describe("MultipleAttackPenalty", () => {
        it("cannot contribute if it has no effects", () => {
            const justMovement = ActionTemplateService.new({
                id: "Move it",
                name: "Move",
            })
            expect(
                ActionTemplateService.multipleAttackPenaltyMultiplier(
                    justMovement
                )
            ).toEqual(0)
        })
        it("knows if none of its effect templates contribute", () => {
            const noMAP = ActionTemplateService.new({
                id: "slap",
                name: "quick slap",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            })
            expect(
                ActionTemplateService.multipleAttackPenaltyMultiplier(noMAP)
            ).toEqual(0)
        })
        it("knows if at least one of its effect templates contributes", () => {
            const withMap = ActionTemplateService.new({
                id: "sworded",
                name: "sword strike",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            })
            expect(
                ActionTemplateService.multipleAttackPenaltyMultiplier(withMap)
            ).toEqual(1)
        })
    })

    describe("actionTemplateRange", () => {
        it("returns default range if none are specified", () => {
            const justWaiting = ActionTemplateService.new({
                id: "justWaiting",
                name: "just waiting",
                actionEffectTemplates: [],
            })

            const ranges =
                ActionTemplateService.getActionTemplateRange(justWaiting)

            expect(ranges).toEqual([0, 0])
        })

        it("returns the range of the only action effect with a range", () => {
            const bow = ActionTemplateService.new({
                id: "bow",
                name: "bow",
                targetConstraints: {
                    minimumRange: 1,
                    maximumRange: 3,
                    targetingShape: TargetingShape.SNAKE,
                },
                actionEffectTemplates: [ActionEffectTemplateService.new({})],
            })

            const ranges = ActionTemplateService.getActionTemplateRange(bow)
            expect(ranges).toEqual([1, 3])
        })
    })

    describe("actionDecisions", () => {
        it("reads the decisions of action effect templates", () => {
            const bow = ActionTemplateService.new({
                id: "run up and shoot bow",
                name: "run up and shoot bow",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                    }),
                ],
            })

            const requiredDecisions: ActionDecisionType[] =
                ActionTemplateService.getActionTemplateDecisionTypes(bow)

            expect(requiredDecisions).toEqual([
                ActionDecisionType.TARGET_SQUADDIE,
            ])
        })
    })

    describe("knows when an action template can heal", () => {
        it("returns true when the action can heal", () => {
            const healSelf = ActionTemplateService.new({
                id: "healSelf",
                name: "healSelf",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGET_SELF]: true,
                        }),
                        healingDescriptions: {
                            [HealingType.LOST_HIT_POINTS]: 1,
                        },
                    }),
                ],
            })

            expect(
                ActionTemplateService.doesActionTemplateHeal(healSelf)
            ).toBeTruthy()
        })
        it("returns false when the action cannot heal", () => {
            const hurtOthers = ActionTemplateService.new({
                id: "healOthers",
                name: "healOthers",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGET_FOE]: true,
                        }),
                        damageDescriptions: {
                            [DamageType.BODY]: 2,
                        },
                    }),
                ],
            })
            expect(
                ActionTemplateService.doesActionTemplateHeal(hurtOthers)
            ).toBeFalsy()
        })
    })

    it("can get all action templates", () => {
        const healSelf = ActionEffectTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.TARGET_SELF]: true,
            }),
            healingDescriptions: {
                [HealingType.LOST_HIT_POINTS]: 1,
            },
        })
        const hurtOthers = ActionEffectTemplateService.new({
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.TARGET_FOE]: true,
            }),
            damageDescriptions: {
                [DamageType.BODY]: 2,
            },
        })

        const hurtOthersAndHealSelf = ActionTemplateService.new({
            id: "hurtOthersAndHealSelf",
            name: "hurtOthersAndHealSelf",
            actionEffectTemplates: [hurtOthers, healSelf],
        })

        expect(
            ActionTemplateService.getActionEffectTemplates(
                hurtOthersAndHealSelf
            )
        ).toEqual([hurtOthers, healSelf])
    })

    describe("rank", () => {
        it("can set the rank of an action", () => {
            const justMovement = ActionTemplateService.new({
                id: "Move it",
                name: "Move",
                rank: 9001,
            })

            expect(justMovement.rank).toEqual(9001)
        })
    })
})
