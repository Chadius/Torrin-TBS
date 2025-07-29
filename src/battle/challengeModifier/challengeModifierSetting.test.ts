import { beforeEach, describe, expect, it } from "vitest"
import {
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
    ChallengeModifierType,
} from "./challengeModifierSetting"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"

describe("Challenge Modifier Setting", () => {
    describe("Training Wheels", () => {
        it("Starts off by default", () => {
            const challengeModifierSetting: ChallengeModifierSetting =
                ChallengeModifierSettingService.new()
            expect(
                challengeModifierSetting[ChallengeModifierType.TRAINING_WHEELS]
            ).toBe(false)
            expect(
                ChallengeModifierSettingService.getSetting(
                    challengeModifierSetting,
                    ChallengeModifierType.TRAINING_WHEELS
                )
            ).toBe(false)
        })
        it("Can turn Training Wheels on", () => {
            const challengeModifierSetting: ChallengeModifierSetting =
                ChallengeModifierSettingService.new()
            ChallengeModifierSettingService.changeSetting({
                challengeModifierSetting: challengeModifierSetting,
                type: ChallengeModifierType.TRAINING_WHEELS,
                value: true,
            })
            expect(
                challengeModifierSetting[ChallengeModifierType.TRAINING_WHEELS]
            ).toBe(true)
            expect(
                ChallengeModifierSettingService.getSetting(
                    challengeModifierSetting,
                    ChallengeModifierType.TRAINING_WHEELS
                )
            ).toBe(true)
        })
        it("Can turn Training Wheels off", () => {
            const challengeModifierSetting: ChallengeModifierSetting =
                ChallengeModifierSettingService.new()
            ChallengeModifierSettingService.changeSetting({
                challengeModifierSetting: challengeModifierSetting,
                type: ChallengeModifierType.TRAINING_WHEELS,
                value: true,
            })
            ChallengeModifierSettingService.changeSetting({
                challengeModifierSetting: challengeModifierSetting,
                type: ChallengeModifierType.TRAINING_WHEELS,
                value: false,
            })
            expect(
                challengeModifierSetting[ChallengeModifierType.TRAINING_WHEELS]
            ).toBe(false)
            expect(
                ChallengeModifierSettingService.getSetting(
                    challengeModifierSetting,
                    ChallengeModifierType.TRAINING_WHEELS
                )
            ).toBe(false)
        })
        describe("modify degree of success", () => {
            let objectRepository: ObjectRepository
            let meleeAttack: ActionTemplate
            beforeEach(() => {
                objectRepository = ObjectRepositoryService.new()
                meleeAttack = ActionTemplateService.new({
                    id: "melee attack",
                    name: "melee attack",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            damageDescriptions: { [DamageType.UNKNOWN]: 1 },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                }
                            ),
                            versusSquaddieResistance:
                                VersusSquaddieResistance.ARMOR,
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    false,
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                    true,
                                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                                    true,
                            },
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    meleeAttack
                )
                ;[
                    {
                        name: "player",
                        battleId: "player",
                        templateId: "player",
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        name: "player2",
                        battleId: "player2",
                        templateId: "player2",
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        name: "ally",
                        battleId: "ally",
                        templateId: "ally",
                        affiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        name: "ally2",
                        battleId: "ally2",
                        templateId: "ally2",
                        affiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        name: "enemy",
                        battleId: "enemy",
                        templateId: "enemy",
                        affiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        name: "enemy2",
                        battleId: "enemy2",
                        templateId: "enemy2",
                        affiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        name: "none",
                        battleId: "none",
                        templateId: "none",
                        affiliation: SquaddieAffiliation.NONE,
                    },
                    {
                        name: "none2",
                        battleId: "none2",
                        templateId: "none2",
                        affiliation: SquaddieAffiliation.NONE,
                    },
                ].forEach(({ name, battleId, affiliation, templateId }) => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            name,
                            battleId,
                            templateId,
                            affiliation,
                            actionTemplateIds: ["melee attack"],
                            objectRepository,
                        }
                    )
                })
            })

            it("if training wheels is not on, preempt has no effect", () => {
                const challengeModifierSetting: ChallengeModifierSetting =
                    ChallengeModifierSettingService.new()

                expect(
                    ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation(
                        {
                            challengeModifierSetting,
                            objectRepository,
                            actorBattleSquaddieId: "player",
                            targetBattleSquaddieId: "enemy",
                            actionTemplateId: "melee attack",
                        }
                    ).didPreempt
                ).toBe(false)
            })

            it("if there is no challenge setting, preempt has no effect", () => {
                expect(
                    ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation(
                        {
                            challengeModifierSetting: undefined,
                            objectRepository,
                            actorBattleSquaddieId: "player",
                            targetBattleSquaddieId: "enemy",
                            actionTemplateId: "melee attack",
                        }
                    ).didPreempt
                ).toBe(false)
            })

            const calculatePreemptedResults = ({
                targetBattleSquaddieId,
                actorBattleSquaddieId,
                actionTemplateId,
            }: {
                targetBattleSquaddieId: string
                actorBattleSquaddieId: string
                actionTemplateId: string
            }) => {
                const challengeModifierSetting: ChallengeModifierSetting =
                    ChallengeModifierSettingService.new()
                ChallengeModifierSettingService.changeSetting({
                    challengeModifierSetting,
                    type: ChallengeModifierType.TRAINING_WHEELS,
                    value: true,
                })

                return ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation(
                    {
                        challengeModifierSetting,
                        objectRepository,
                        actorBattleSquaddieId,
                        targetBattleSquaddieId,
                        actionTemplateId,
                    }
                )
            }

            describe("preempt player attacks against foes into critical successes", () => {
                const preemptPlayerActTests = [
                    {
                        targetBattleSquaddieId: "enemy",
                    },
                    {
                        targetBattleSquaddieId: "none",
                    },
                ]
                it.each(preemptPlayerActTests)(
                    `$targetBattleSquaddieId`,
                    ({ targetBattleSquaddieId }) => {
                        const preemptResults = calculatePreemptedResults({
                            targetBattleSquaddieId,
                            actorBattleSquaddieId: "player",
                            actionTemplateId: "melee attack",
                        })

                        expect(preemptResults.didPreempt).toBe(true)
                        expect(preemptResults.newDegreeOfSuccess).toEqual(
                            DegreeOfSuccess.CRITICAL_SUCCESS
                        )
                    }
                )
            })
            describe("player attacks against allies are not affected", () => {
                const preemptPlayerActTests = [
                    {
                        targetBattleSquaddieId: "player2",
                    },
                    {
                        targetBattleSquaddieId: "ally",
                    },
                ]
                it.each(preemptPlayerActTests)(
                    `$targetBattleSquaddieId`,
                    ({ targetBattleSquaddieId }) => {
                        const preemptResults = calculatePreemptedResults({
                            targetBattleSquaddieId,
                            actorBattleSquaddieId: "player",
                            actionTemplateId: "melee attack",
                        })

                        expect(preemptResults.didPreempt).toBe(false)
                    }
                )
            })

            describe("preempt attacks against players into critical failures", () => {
                const preemptPlayerActTests = [
                    {
                        actorBattleSquaddieId: "enemy",
                    },
                    {
                        actorBattleSquaddieId: "ally",
                    },
                    {
                        actorBattleSquaddieId: "none",
                    },
                ]
                it.each(preemptPlayerActTests)(
                    `$actorBattleSquaddieId`,
                    ({ actorBattleSquaddieId }) => {
                        const preemptResults = calculatePreemptedResults({
                            actorBattleSquaddieId,
                            targetBattleSquaddieId: "player",
                            actionTemplateId: "melee attack",
                        })

                        expect(preemptResults.didPreempt).toBe(true)
                        expect(preemptResults.newDegreeOfSuccess).toEqual(
                            DegreeOfSuccess.CRITICAL_FAILURE
                        )
                    }
                )
            })

            describe("enemy attacks against non players are not affected", () => {
                const preemptPlayerActTests = [
                    {
                        targetBattleSquaddieId: "enemy2",
                    },
                    {
                        targetBattleSquaddieId: "ally",
                    },
                    {
                        targetBattleSquaddieId: "none",
                    },
                ]
                it.each(preemptPlayerActTests)(
                    `$targetBattleSquaddieId`,
                    ({ targetBattleSquaddieId }) => {
                        const preemptResults = calculatePreemptedResults({
                            targetBattleSquaddieId,
                            actorBattleSquaddieId: "enemy",
                            actionTemplateId: "melee attack",
                        })

                        expect(preemptResults.didPreempt).toBe(false)
                    }
                )
            })
            describe("allies and no affiliation squaddies attacks against non players are not affected", () => {
                const preemptPlayerActTests = [
                    {
                        actorBattleSquaddieId: "ally",
                        targetBattleSquaddieId: "enemy",
                    },
                    {
                        actorBattleSquaddieId: "ally",
                        targetBattleSquaddieId: "ally2",
                    },
                    {
                        actorBattleSquaddieId: "ally",
                        targetBattleSquaddieId: "none",
                    },
                    {
                        actorBattleSquaddieId: "none",
                        targetBattleSquaddieId: "enemy",
                    },
                    {
                        actorBattleSquaddieId: "none",
                        targetBattleSquaddieId: "ally",
                    },
                    {
                        actorBattleSquaddieId: "none",
                        targetBattleSquaddieId: "none2",
                    },
                ]
                it.each(preemptPlayerActTests)(
                    `$actorBattleSquaddieId vs $targetBattleSquaddieId`,
                    ({ targetBattleSquaddieId, actorBattleSquaddieId }) => {
                        const preemptResults = calculatePreemptedResults({
                            targetBattleSquaddieId,
                            actorBattleSquaddieId,
                            actionTemplateId: "melee attack",
                        })

                        expect(preemptResults.didPreempt).toBe(false)
                    }
                )
            })

            it("player attacks that cannot crit succeed will preempt into successes", () => {
                const challengeModifierSetting: ChallengeModifierSetting =
                    ChallengeModifierSettingService.new()
                ChallengeModifierSettingService.changeSetting({
                    challengeModifierSetting,
                    type: ChallengeModifierType.TRAINING_WHEELS,
                    value: true,
                })
                const meleeAttackCannotCrit = ActionTemplateService.new({
                    id: "melee attack cannot crit",
                    name: "melee attack cannot crit",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            damageDescriptions: { [DamageType.UNKNOWN]: 1 },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                    [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                                }
                            ),
                            versusSquaddieResistance:
                                VersusSquaddieResistance.ARMOR,
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                    true,
                            },
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    meleeAttackCannotCrit
                )

                expect(
                    ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation(
                        {
                            challengeModifierSetting,
                            objectRepository,
                            actorBattleSquaddieId: "player",
                            targetBattleSquaddieId: "enemy",
                            actionTemplateId: "melee attack cannot crit",
                        }
                    )
                ).toEqual({
                    didPreempt: true,
                    newDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })
            })
            it("enemy attacks that cannot crit fail will preempt into failure", () => {
                const challengeModifierSetting: ChallengeModifierSetting =
                    ChallengeModifierSettingService.new()
                ChallengeModifierSettingService.changeSetting({
                    challengeModifierSetting,
                    type: ChallengeModifierType.TRAINING_WHEELS,
                    value: true,
                })
                const meleeAttackCannotCrit = ActionTemplateService.new({
                    id: "melee attack cannot crit",
                    name: "melee attack cannot crit",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            damageDescriptions: { [DamageType.UNKNOWN]: 1 },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.ATTACK]: true,
                                    [Trait.CANNOT_CRITICALLY_FAIL]: true,
                                }
                            ),
                            versusSquaddieResistance:
                                VersusSquaddieResistance.ARMOR,
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                    true,
                            },
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    meleeAttackCannotCrit
                )

                expect(
                    ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation(
                        {
                            challengeModifierSetting,
                            objectRepository,
                            actorBattleSquaddieId: "enemy",
                            targetBattleSquaddieId: "player",
                            actionTemplateId: "melee attack cannot crit",
                        }
                    )
                ).toEqual({
                    didPreempt: true,
                    newDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                })
            })
        })
    })
})
