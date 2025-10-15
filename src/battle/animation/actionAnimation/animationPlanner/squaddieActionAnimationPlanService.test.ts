import { beforeEach, describe, expect, it } from "vitest"
import {
    BattleAction,
    BattleActionService,
} from "../../../history/battleAction/battleAction"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../../history/battleAction/battleActionSquaddieChange"
import { DegreeOfSuccess } from "../../../calculator/actionCalculator/degreeOfSuccess"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { SquaddieRepositoryService } from "../../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import {
    SquaddieActionAnimationPlan,
    SquaddieActionAnimationPlanService,
} from "./squaddieActionAnimationPlanService"
import { SquaddieEmotion } from "../actionAnimationConstants"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import {
    SquaddieActionAnimationEvent,
    SquaddieActionAnimationMotion,
    TSquaddieActionAnimationMotion,
} from "./squaddieActionAnimationEvent/squaddieActionAnimationEvent"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../../action/template/actionEffectTemplate"
import { Damage, Healing } from "../../../../squaddie/squaddieService"
import {
    ActionRange,
    TargetConstraintsService,
} from "../../../../action/targetConstraints"
import { CoordinateGeneratorShape } from "../../../targeting/coordinateGenerator"
import { ActionTemplateService } from "../../../../action/template/actionTemplate"

describe("AnimationPlanner", () => {
    let repository: ObjectRepository

    let actorId = "actor"
    let target0Id = "target0Id"

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        ObjectRepositoryService.addActionTemplate(
            repository,
            ActionTemplateService.new({
                id: "longsword",
                name: "longsword",
                buttonIconResourceKey: "longsword",
                targetConstraints: TargetConstraintsService.new({
                    range: ActionRange.MELEE,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                        },
                        damageDescriptions: {
                            [Damage.BODY]: 3,
                        },
                    }),
                ],
            })
        )

        ObjectRepositoryService.addActionTemplate(
            repository,
            ActionTemplateService.new({
                id: "heal",
                name: "heal",
                buttonIconResourceKey: "heal",
                targetConstraints: TargetConstraintsService.new({
                    range: ActionRange.MELEE,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        },
                        healingDescriptions: {
                            [Healing.LOST_HIT_POINTS]: 10,
                        },
                    }),
                ],
            })
        )
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            battleId: actorId,
            name: actorId,
            objectRepository: repository,
            affiliation: SquaddieAffiliation.PLAYER,
            templateId: "actor",
            actionTemplateIds: ["longsword", "heal"],
        })
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            battleId: target0Id,
            name: target0Id,
            objectRepository: repository,
            affiliation: SquaddieAffiliation.ENEMY,
            templateId: "target",
            actionTemplateIds: [],
        })
    })

    describe("Melee Attacker strikes but does not defeat Defender", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            damageExplanation: DamageExplanationService.new({
                                raw: 3,
                                net: 2,
                                willKo: false,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })
            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })

        it("Will start with actor and target in initial spots", () => {
            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: 0,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
            expect(squaddiePosition[actorId].screenLocation.x).toBeCloseTo(
                (2 * ScreenDimensions.SCREEN_WIDTH) / 12,
                2
            )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
            expect(squaddiePosition[target0Id].screenLocation.x).toBeCloseTo(
                (8 * ScreenDimensions.SCREEN_WIDTH) / 12,
                2
            )
        })
        it("Knows the attacker will use correct emotions when preparing to strike", () => {
            expect(
                expectMeleeAttackerToLungeAndHit({
                    animationPlan,
                    actorId,
                })
            ).toBeTruthy()
        })
        it("Knows what sprite emotions to use when the target is struck", () => {
            const gotHitEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.TARGET_IS_STRUCK,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: gotHitEvent.startTime,
                    }
                )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.DAMAGED
            )
        })
        it("Knows how long the animation will take to complete", () => {
            const hittingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
            })

            expect(
                SquaddieActionAnimationPlanService.getTotalAnimationTime({
                    animationPlan: animationPlan,
                })
            ).toBeCloseTo(
                hittingEvent.startTime +
                    animationPlan.waitTimeAfterAnimationCompletes
            )
        })
        it("is not finished until the animation time passes", () => {
            expect(
                SquaddieActionAnimationPlanService.isFinished({
                    animationPlan: animationPlan,
                    timeElapsed: 0,
                })
            ).toBeFalsy()
            expect(
                SquaddieActionAnimationPlanService.isFinished({
                    animationPlan: animationPlan,
                    timeElapsed:
                        SquaddieActionAnimationPlanService.getTotalAnimationTime(
                            {
                                animationPlan: animationPlan,
                            }
                        )!,
                })
            ).toBeTruthy()
        })
    })

    describe("Melee Attacker strikes and defeats the Defender", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            damageExplanation: DamageExplanationService.new({
                                raw: 9002,
                                net: 9001,
                                willKo: true,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })
            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })

        it("Knows the attacker will use correct emotions when preparing to strike", () => {
            expect(
                expectMeleeAttackerToLungeAndHit({
                    animationPlan,
                    actorId,
                })
            ).toBeTruthy()
        })

        it("Knows what sprite emotions to use when the target is struck and defeated", () => {
            const wasDefeatedEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.TARGET_IS_DEFEATED,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: wasDefeatedEvent.startTime,
                    }
                )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.DEAD
            )
        })
    })

    describe("Melee Attacker critically strikes and defeats the Defender", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess:
                                DegreeOfSuccess.CRITICAL_SUCCESS,
                            damageExplanation: DamageExplanationService.new({
                                raw: 9002,
                                net: 9001,
                                willKo: true,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })
            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })

        it("Knows what sprite emotions to use when the attacker is preparing a critical strike", () => {
            const movingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: movingEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )
        })

        it("Knows the attacker will use correct emotions when critically lunging to strike", () => {
            const movingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: movingEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )
        })

        it("Knows the attacker will hit and show results at the correct time", () => {
            const hittingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
            })

            expect(
                SquaddieActionAnimationPlanService.getTimeToShowResults({
                    animationPlan,
                })
            ).toBeCloseTo(hittingEvent.startTime)
        })

        it("Knows the attacker and defender will react at the same time", () => {
            const attackerHitsEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
            })

            const defenderGotHitEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.TARGET_IS_DEFEATED,
            })

            expect(attackerHitsEvent.startTime).toBeCloseTo(
                defenderGotHitEvent.startTime
            )
        })
    })

    describe("Melee Attacker misses the Defender", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                            damageExplanation: DamageExplanationService.new({
                                raw: 0,
                                net: 0,
                                willKo: false,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })

            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })

        it("Knows the attacker will use correct emotions when lunging to strike but will miss the Defender", () => {
            const movingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES_BUT_WILL_MISS,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: movingEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )
        })

        it("Knows the attacker will use correct emotions when they miss the Defender", () => {
            const impactEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_MISSES_AND_STOPS,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: impactEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )

            expect(
                SquaddieActionAnimationPlanService.getTimeToShowResults({
                    animationPlan,
                })
            ).toBeCloseTo(impactEvent.startTime)
        })

        it("will show the defender under attack when they miss", () => {
            const dodgeEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.MELEE_TARGET_DODGES_ATTACK,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: dodgeEvent.startTime,
                    }
                )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
        })

        it("will show the defender moving slightly before the hit", () => {
            const dodgeEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.MELEE_TARGET_DODGES_ATTACK,
            })

            const impactEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_MISSES_AND_STOPS,
            })

            expect(dodgeEvent.startTime).toBeLessThan(impactEvent.startTime)
            expect(dodgeEvent.startTime).toBeGreaterThan(
                impactEvent.startTime * 0.75
            )
        })
    })

    describe("Melee Attacker critically misses the Defender", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "longsword",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess:
                                DegreeOfSuccess.CRITICAL_FAILURE,
                            damageExplanation: DamageExplanationService.new({
                                raw: 0,
                                net: 0,
                                willKo: false,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })

            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })

        it("Knows the attacker will use correct emotions when lunging to strike but will critically miss the Defender", () => {
            const movingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES_BUT_WILL_MISS,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: movingEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )
        })

        it("Knows the attacker will use correct emotions when they miss the Defender", () => {
            const impactEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: impactEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ATTACK
            )

            expect(
                SquaddieActionAnimationPlanService.getTimeToShowResults({
                    animationPlan,
                })
            ).toBeCloseTo(impactEvent.startTime)
        })

        it("will show the defender ignore the attack entirely", () => {
            const dodgeEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.MELEE_TARGET_IGNORES_ATTACK,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: dodgeEvent.startTime,
                    }
                )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
        })

        it("will show the defender moving slightly before the hit", () => {
            const dodgeEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.MELEE_TARGET_IGNORES_ATTACK,
            })

            const impactEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS,
            })

            expect(dodgeEvent.startTime).toBeLessThan(impactEvent.startTime)
        })
    })

    describe("Actor wants to Assist the target", () => {
        let battleAction: BattleAction
        let animationPlan: SquaddieActionAnimationPlan
        beforeEach(() => {
            battleAction = BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: actorId,
                },
                action: {
                    actionTemplateId: "heal",
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: target0Id,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            healingReceived: 10,
                        }),
                    ],
                },
            })
            animationPlan =
                SquaddieActionAnimationPlanService.createAnimationPlan({
                    battleAction,
                    repository,
                })
        })
        it("Will start with actor and target in initial spots", () => {
            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: 0,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
            expect(squaddiePosition[actorId].screenLocation.x).toBeCloseTo(
                (3 * ScreenDimensions.SCREEN_WIDTH) / 12,
                2
            )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.NEUTRAL
            )
            expect(squaddiePosition[target0Id].screenLocation.x).toBeCloseTo(
                (7 * ScreenDimensions.SCREEN_WIDTH) / 12,
                2
            )
        })
        it("Knows the actor will use correct emotions when preparing to assist", () => {
            const movingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.ACTOR_MOVES_TO_ASSIST_TARGET,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: movingEvent.startTime,
                    }
                )

            expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
                SquaddieEmotion.ASSISTING
            )

            const assistingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.ACTOR_REACHES_TARGET_AND_ASSISTS,
            })

            expect(
                SquaddieActionAnimationPlanService.getTimeToShowResults({
                    animationPlan,
                })
            ).toBeCloseTo(assistingEvent.startTime)
        })
        it("Knows what sprite emotions to use when the target is assisted", () => {
            const gotAssistedEvent = getAnimationEvent({
                animationPlan,
                actorId: target0Id,
                motion: SquaddieActionAnimationMotion.TARGET_IS_ASSISTED,
            })

            const squaddiePosition =
                SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions(
                    {
                        animationPlan,
                        timeElapsed: gotAssistedEvent.startTime,
                    }
                )

            expect(squaddiePosition[target0Id].squaddieEmotion).toEqual(
                SquaddieEmotion.THANKFUL
            )
        })
        it("Knows how long the animation will take to complete", () => {
            const assistingEvent = getAnimationEvent({
                animationPlan,
                actorId,
                motion: SquaddieActionAnimationMotion.ACTOR_REACHES_TARGET_AND_ASSISTS,
            })

            expect(
                SquaddieActionAnimationPlanService.getTotalAnimationTime({
                    animationPlan: animationPlan,
                })
            ).toBeCloseTo(
                assistingEvent.startTime +
                    animationPlan.waitTimeAfterAnimationCompletes
            )
        })
        it("is not finished until the animation time passes", () => {
            expect(
                SquaddieActionAnimationPlanService.isFinished({
                    animationPlan: animationPlan,
                    timeElapsed: 0,
                })
            ).toBeFalsy()
            expect(
                SquaddieActionAnimationPlanService.isFinished({
                    animationPlan: animationPlan,
                    timeElapsed:
                        SquaddieActionAnimationPlanService.getTotalAnimationTime(
                            {
                                animationPlan: animationPlan,
                            }
                        )!,
                })
            ).toBeTruthy()
        })
    })
})

const expectMeleeAttackerToLungeAndHit = ({
    animationPlan,
    actorId,
}: {
    animationPlan: SquaddieActionAnimationPlan
    actorId: string
}) => {
    const movingEvent = getAnimationEvent({
        animationPlan,
        actorId,
        motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES,
    })

    const squaddiePosition =
        SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions({
            animationPlan,
            timeElapsed: movingEvent.startTime,
        })

    expect(squaddiePosition[actorId].squaddieEmotion).toEqual(
        SquaddieEmotion.ATTACK
    )

    const hittingEvent = getAnimationEvent({
        animationPlan,
        actorId,
        motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
    })

    expect(
        SquaddieActionAnimationPlanService.getTimeToShowResults({
            animationPlan,
        })
    ).toBeCloseTo(hittingEvent.startTime)
    return true
}

const getAnimationEvent = ({
    animationPlan,
    actorId,
    motion,
}: {
    animationPlan: SquaddieActionAnimationPlan
    actorId: string
    motion: TSquaddieActionAnimationMotion
}): SquaddieActionAnimationEvent => {
    const eventToFind = animationPlan.events.find(
        (event) => event.battleSquaddieId == actorId && event.motion == motion
    )
    if (eventToFind == undefined) {
        throw new Error(
            `[getAnimationEvent] Could not find event with battleSquaddieId ${actorId} and motion ${motion}`
        )
    }
    return eventToFind
}
