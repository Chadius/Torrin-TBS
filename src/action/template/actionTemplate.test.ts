import { beforeEach, describe, expect, it } from "vitest"
import { ActionDecisionType, ActionTemplateService } from "./actionTemplate"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "./actionEffectTemplate"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { TargetConstraintsService } from "../targetConstraints"
import { CoordinateGeneratorShape } from "../../battle/targeting/coordinateGenerator"

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
        expect(justMovement.targetConstraints.coordinateGeneratorShape).toEqual(
            CoordinateGeneratorShape.BLOOM
        )
        expect(justMovement.userInformation.userReadableDescription).toEqual(
            "Missing Description"
        )
        expect(justMovement.userInformation.customGlossaryTerms).toHaveLength(0)
    })

    it("can create a template with new action effects", () => {
        const attackTemplate = ActionEffectTemplateService.new({
            damageDescriptions: { [DamageType.BODY]: 2 },
            healingDescriptions: {},
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.ATTACK]: true,
            }),
        })

        const attackAction = ActionTemplateService.new({
            id: "strike",
            name: "strike",
            actionEffectTemplates: [attackTemplate],
            userInformation: {
                userReadableDescription: "Attack!",
                customGlossaryTerms: [
                    {
                        name: "customGlossaryTerm",
                        definition: "glossary definition",
                    },
                ],
            },
        })

        expect(attackAction.actionEffectTemplates).toHaveLength(1)
        expect(attackAction.actionEffectTemplates[0]).toEqual(attackTemplate)
        expect(attackAction.userInformation.userReadableDescription).toEqual(
            "Attack!"
        )
        expect(attackAction.userInformation.customGlossaryTerms).toHaveLength(1)
        expect(attackAction.userInformation.customGlossaryTerms[0].name).toBe(
            "customGlossaryTerm"
        )
        expect(
            attackAction.userInformation.customGlossaryTerms[0].definition
        ).toBe("glossary definition")
    })

    describe("Range", () => {
        it("can create a template with a given range", () => {
            const actionTemplate = ActionTemplateService.new({
                id: "strike",
                name: "strike",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 1,
                    maximumRange: 10,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                }),
            })
            expect(actionTemplate.targetConstraints.minimumRange).toEqual(1)
            expect(actionTemplate.targetConstraints.maximumRange).toEqual(10)
            expect(
                actionTemplate.targetConstraints.coordinateGeneratorShape
            ).toEqual(CoordinateGeneratorShape.BLOOM)
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
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
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
                        healingDescriptions: {
                            [HealingType.LOST_HIT_POINTS]: 1,
                        },
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
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
                        damageDescriptions: {
                            [DamageType.BODY]: 2,
                        },
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                true,
                        },
                    }),
                ],
            })
            expect(
                ActionTemplateService.doesActionTemplateHeal(hurtOthers)
            ).toBeFalsy()
        })
    })

    describe("knows when an action template aims at foes", () => {
        let healSelf: ActionEffectTemplate
        let hurtOthers: ActionEffectTemplate

        beforeEach(() => {
            healSelf = ActionEffectTemplateService.new({
                healingDescriptions: {
                    [HealingType.LOST_HIT_POINTS]: 1,
                },
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                },
            })
            hurtOthers = ActionEffectTemplateService.new({
                damageDescriptions: {
                    [DamageType.BODY]: 2,
                },
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                },
            })
        })

        it("can get all action templates", () => {
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

        it("if the first template targets foes the action targets foes", () => {
            const hurtThenHeal = ActionTemplateService.new({
                id: "hurtThenHeal",
                name: "hurtThenHeal",
                actionEffectTemplates: [hurtOthers, healSelf],
            })
            expect(
                ActionTemplateService.doesItTargetFoesFirst(hurtThenHeal)
            ).toBeTruthy()
            expect(
                ActionTemplateService.doesItNotTargetFoesFirst(hurtThenHeal)
            ).toBeFalsy()
        })

        it("if the first template does not targets foes the action does not targets foes", () => {
            const healThenHurt = ActionTemplateService.new({
                id: "healThenHurt",
                name: "healThenHurt",
                actionEffectTemplates: [healSelf, hurtOthers],
            })
            expect(
                ActionTemplateService.doesItTargetFoesFirst(healThenHurt)
            ).toBeFalsy()
            expect(
                ActionTemplateService.doesItNotTargetFoesFirst(healThenHurt)
            ).toBeTruthy()
        })
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
