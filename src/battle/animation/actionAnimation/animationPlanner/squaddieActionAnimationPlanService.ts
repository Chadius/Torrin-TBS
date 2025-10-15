import { BattleAction } from "../../../history/battleAction/battleAction"
import { ScreenLocation } from "../../../../utils/mouseConfig"
import { TSquaddieEmotion } from "../actionAnimationConstants"
import {
    SquaddieActionAnimationEvent,
    SquaddieActionAnimationEventService,
    SquaddieActionAnimationEventTiming,
    SquaddieActionAnimationMotion,
    TSquaddieActionAnimationMotion,
} from "./squaddieActionAnimationEvent/squaddieActionAnimationEvent"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { ActionEffectTemplateService } from "../../../../action/template/actionEffectTemplate"
import { EnumLike } from "../../../../utils/enum"
import { BattleActionSquaddieChange } from "../../../history/battleAction/battleActionSquaddieChange"
import {
    CurveInterpolation,
    CurveInterpolationService,
} from "../../../../../gitSubmodules/CurveInterpolation/src/curveInterpolation"
import { InterpolationTypeEnum } from "../../../../../gitSubmodules/CurveInterpolation/src/interpolationType"
import {
    HORIZONTAL_ALIGN,
    HORIZONTAL_ALIGN_TYPE,
    VERTICAL_ALIGN,
    VERTICAL_ALIGN_TYPE,
    WINDOW_SPACING,
} from "../../../../ui/constants"

export interface SquaddieActionAnimationPlan {
    waitTimeAfterAnimationCompletes: number
    waitTimeToShowResults: number
    events: SquaddieActionAnimationEvent[]
    startLocationBySquaddieId: {
        [battleSquaddieId: string]: {
            screenLocation: ScreenLocation
            horizontalAnchor: HORIZONTAL_ALIGN_TYPE
            verticalAnchor: VERTICAL_ALIGN_TYPE
        }
    }
    actionScenario: TActionScenario
}

export interface SquaddieAnimationDrawingInstructions {
    screenLocation: ScreenLocation
    squaddieEmotion: TSquaddieEmotion
    locationAnchor: {
        horizontal: HORIZONTAL_ALIGN_TYPE
        vertical: VERTICAL_ALIGN_TYPE
    }
}

const AnimationTimingConstants = {
    waitTimeAfterAnimationCompletes: 2000,
}

const ActionScenario = {
    MELEE_ATTACK: "MELEE_ATTACK",
    ASSIST: "ASSIST",
} as const satisfies Record<string, string>
export type TActionScenario = EnumLike<typeof ActionScenario>

export const SquaddieActionAnimationPlanService = {
    createAnimationPlan: ({
        battleAction,
        repository,
    }: {
        battleAction: BattleAction
        repository: ObjectRepository
    }): SquaddieActionAnimationPlan => {
        const scenario = calculateScenario({
            battleAction,
            repository,
        })

        const events = getActorEventsByScenario({
            battleAction: battleAction,
            scenario: scenario,
        })

        const startLocationBySquaddieId = {
            [battleAction.actor.actorBattleSquaddieId]:
                getStartingLocationByScenario({
                    battleAction: battleAction,
                    scenario: scenario,
                    battleSquaddieId: battleAction.actor.actorBattleSquaddieId,
                }),
        }

        battleAction.effect.squaddie?.forEach((squaddieEffect) => {
            events.push(
                ...getTargetEventsByScenario({
                    battleAction,
                    scenario,
                    squaddieEffect,
                })
            )
            startLocationBySquaddieId[squaddieEffect.battleSquaddieId] =
                getStartingLocationByScenario({
                    battleAction,
                    scenario,
                    battleSquaddieId: squaddieEffect.battleSquaddieId,
                })
        })

        return {
            events,
            startLocationBySquaddieId,
            actionScenario: scenario,
            waitTimeAfterAnimationCompletes:
                AnimationTimingConstants.waitTimeAfterAnimationCompletes,
            waitTimeToShowResults: calculateTimeToShowResults({
                events,
                scenario,
            }),
        }
    },
    getSquaddieDrawingInstructions: ({
        animationPlan,
        timeElapsed,
    }: {
        animationPlan: SquaddieActionAnimationPlan
        timeElapsed: number
    }): {
        [battleSquaddieId: string]: SquaddieAnimationDrawingInstructions
    } => {
        if (animationPlan == undefined) {
            throw new Error(
                "[SquaddieActionAnimationPlanService.getSquaddiePositionsAtTime]: animationPlan must be defined"
            )
        }

        return animationPlan.events.reduce(
            (
                squaddiePositionAtTime,
                event
            ): {
                [battleSquaddieId: string]: SquaddieAnimationDrawingInstructions
            } => {
                if (
                    squaddiePositionAtTime[event.battleSquaddieId] !=
                        undefined &&
                    event.startTime > timeElapsed
                )
                    return squaddiePositionAtTime

                if (
                    squaddiePositionAtTime[event.battleSquaddieId] == undefined
                ) {
                    squaddiePositionAtTime[event.battleSquaddieId] = {
                        screenLocation:
                            animationPlan.startLocationBySquaddieId[
                                event.battleSquaddieId
                            ].screenLocation,
                        squaddieEmotion: event.squaddieEmotion,
                        locationAnchor: {
                            horizontal:
                                animationPlan.startLocationBySquaddieId[
                                    event.battleSquaddieId
                                ].horizontalAnchor,
                            vertical:
                                animationPlan.startLocationBySquaddieId[
                                    event.battleSquaddieId
                                ].verticalAnchor,
                        },
                    }
                }

                const { x: locationOverTimeX, y: locationOverTimeY } =
                    getScreenPositionOverTime({
                        motion: event.motion,
                        animationPlan,
                    })
                const timeElapsedSinceEventStarted = Math.max(
                    0,
                    timeElapsed - event.startTime
                )
                squaddiePositionAtTime[event.battleSquaddieId].screenLocation =
                    {
                        x:
                            squaddiePositionAtTime[event.battleSquaddieId]
                                .screenLocation.x +
                            CurveInterpolationService.calculate(
                                locationOverTimeX,
                                timeElapsedSinceEventStarted
                            ),
                        y:
                            squaddiePositionAtTime[event.battleSquaddieId]
                                .screenLocation.y +
                            CurveInterpolationService.calculate(
                                locationOverTimeY,
                                timeElapsedSinceEventStarted
                            ),
                    }
                squaddiePositionAtTime[event.battleSquaddieId].squaddieEmotion =
                    event.squaddieEmotion
                return squaddiePositionAtTime
            },
            {}
        )
    },
    getTimeToShowResults: ({
        animationPlan,
    }: {
        animationPlan: SquaddieActionAnimationPlan
    }): number | undefined => {
        if (animationPlan == undefined) {
            throw new Error(
                "[SquaddieActionAnimationPlanService.calculateTimeToShowResults]: animationPlan must be defined"
            )
        }

        return animationPlan.waitTimeToShowResults
    },
    getTotalAnimationTime: ({
        animationPlan,
    }: {
        animationPlan: SquaddieActionAnimationPlan
    }) => getTotalAnimationTime({ animationPlan }),
    isFinished: ({
        animationPlan,
        timeElapsed,
    }: {
        animationPlan: SquaddieActionAnimationPlan
        timeElapsed: number
    }): boolean => {
        if (animationPlan == undefined) {
            throw new Error(
                "[SquaddieActionAnimationPlanService.isFinished]: animationPlan must be defined"
            )
        }

        const totalTime = getTotalAnimationTime({ animationPlan })
        if (totalTime == undefined) {
            throw new Error(
                "[SquaddieActionAnimationPlanService.isFinished]: totalTime was undefined"
            )
        }

        return timeElapsed >= totalTime
    },
}

const getFinalEvent = ({
    events,
    scenario,
}: {
    events: SquaddieActionAnimationEvent[]
    scenario: TActionScenario
}): SquaddieActionAnimationEvent | undefined => {
    let finalEvents: SquaddieActionAnimationEvent[]
    switch (scenario) {
        case ActionScenario.MELEE_ATTACK:
            finalEvents = events.filter(
                (event) =>
                    event.motion ==
                        SquaddieActionAnimationMotion.TARGET_IS_STRUCK ||
                    event.motion ==
                        SquaddieActionAnimationMotion.TARGET_IS_DEFEATED ||
                    event.motion ==
                        SquaddieActionAnimationMotion.MELEE_TARGET_DODGES_ATTACK ||
                    event.motion ==
                        SquaddieActionAnimationMotion.MELEE_TARGET_IGNORES_ATTACK
            )
            break
        case ActionScenario.ASSIST:
            finalEvents = events.filter(
                (event) =>
                    event.motion ==
                    SquaddieActionAnimationMotion.TARGET_IS_ASSISTED
            )

            break
    }

    if (finalEvents.length > 0) {
        return finalEvents.toSorted((a, b) => a.startTime - b.startTime)[
            finalEvents.length - 1
        ]
    }

    return undefined
}

const getTotalAnimationTime = ({
    animationPlan,
}: {
    animationPlan: SquaddieActionAnimationPlan
}): number | undefined => {
    if (animationPlan == undefined) {
        throw new Error(
            "[SquaddieActionAnimationPlanService.getTotalAnimationTime]: animationPlan must be defined"
        )
    }

    const finalEvent = getFinalEvent({
        events: animationPlan.events,
        scenario: animationPlan.actionScenario,
    })
    return finalEvent
        ? finalEvent.startTime +
              AnimationTimingConstants.waitTimeAfterAnimationCompletes
        : undefined
}

const calculateTimeToShowResults = ({
    events,
    scenario,
}: {
    events: SquaddieActionAnimationEvent[]
    scenario: TActionScenario
}) => {
    switch (scenario) {
        case ActionScenario.MELEE_ATTACK:
            return (
                events.find(
                    (event) =>
                        event.motion ==
                            SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS ||
                        event.motion ==
                            SquaddieActionAnimationMotion.MELEE_ATTACKER_MISSES_AND_STOPS ||
                        event.motion ==
                            SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS
                )?.startTime ?? 0
            )
        case ActionScenario.ASSIST:
            return (
                events.find(
                    (event) =>
                        event.motion ==
                        SquaddieActionAnimationMotion.ACTOR_REACHES_TARGET_AND_ASSISTS
                )?.startTime ?? 0
            )
    }
}

const calculateScenario = ({
    battleAction,
    repository,
}: {
    battleAction: BattleAction
    repository: ObjectRepository
}): TActionScenario => {
    if (!battleAction.action.actionTemplateId)
        throw new Error(
            "[SquaddieActionAnimationPlanService.calculateScenario] Action template ID not found"
        )

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        repository,
        battleAction.action.actionTemplateId
    )
    if (!actionTemplate)
        throw new Error(
            "[SquaddieActionAnimationPlanService.calculateScenario] Action template not found"
        )

    if (
        ActionEffectTemplateService.doesItTargetFoes(
            actionTemplate.actionEffectTemplates[0]
        )
    ) {
        return ActionScenario.MELEE_ATTACK
    }

    return ActionScenario.ASSIST
}

const getActorEventsByScenario = ({
    battleAction,
    scenario,
}: {
    battleAction: BattleAction
    scenario: TActionScenario
}): SquaddieActionAnimationEvent[] => {
    switch (scenario) {
        case ActionScenario.MELEE_ATTACK:
            return [
                ...SquaddieActionAnimationEventService.createMeleeAttackerEvents(
                    {
                        battleSquaddieId:
                            battleAction.actor.actorBattleSquaddieId,
                        battleAction,
                    }
                ),
            ]
        case ActionScenario.ASSIST:
            return [
                ...SquaddieActionAnimationEventService.createAssistAssistantEvents(
                    {
                        battleSquaddieId:
                            battleAction.actor.actorBattleSquaddieId,
                        battleAction,
                    }
                ),
            ]
    }
}

const getTargetEventsByScenario = ({
    squaddieEffect,
    battleAction,
    scenario,
}: {
    squaddieEffect: BattleActionSquaddieChange
    battleAction: BattleAction
    scenario: TActionScenario
}): SquaddieActionAnimationEvent[] => {
    switch (scenario) {
        case ActionScenario.MELEE_ATTACK:
            return [
                ...SquaddieActionAnimationEventService.createMeleeTargetEvents({
                    battleSquaddieId: squaddieEffect.battleSquaddieId,
                    squaddieEffect,
                    battleAction,
                }),
            ]
        case ActionScenario.ASSIST:
            return [
                ...SquaddieActionAnimationEventService.createAssistTargetEvents(
                    {
                        battleSquaddieId: squaddieEffect.battleSquaddieId,
                    }
                ),
            ]
    }
}

const getStartingLocationByScenario = ({
    battleAction,
    scenario,
    battleSquaddieId,
}: {
    battleAction: BattleAction
    scenario: TActionScenario
    battleSquaddieId: string
}): {
    screenLocation: ScreenLocation
    horizontalAnchor: HORIZONTAL_ALIGN_TYPE
    verticalAnchor: VERTICAL_ALIGN_TYPE
} => {
    let squaddieRole: "actor" | "target" =
        battleSquaddieId === battleAction.actor.actorBattleSquaddieId
            ? "actor"
            : "target"
    switch (scenario) {
        case ActionScenario.MELEE_ATTACK:
            return {
                screenLocation: {
                    x:
                        squaddieRole === "actor"
                            ? (ScreenDimensions.SCREEN_WIDTH * 2) / 12
                            : (ScreenDimensions.SCREEN_WIDTH * 8) / 12,
                    y: (ScreenDimensions.SCREEN_HEIGHT * 4) / 12,
                },
                horizontalAnchor:
                    squaddieRole === "actor"
                        ? HORIZONTAL_ALIGN.RIGHT
                        : HORIZONTAL_ALIGN.LEFT,
                verticalAnchor: VERTICAL_ALIGN.BASELINE,
            }
        case ActionScenario.ASSIST:
            return {
                screenLocation: {
                    x:
                        squaddieRole === "actor"
                            ? (ScreenDimensions.SCREEN_WIDTH * 3) / 12
                            : (ScreenDimensions.SCREEN_WIDTH * 7) / 12,
                    y: (ScreenDimensions.SCREEN_HEIGHT * 4) / 12,
                },
                horizontalAnchor:
                    squaddieRole === "actor"
                        ? HORIZONTAL_ALIGN.RIGHT
                        : HORIZONTAL_ALIGN.LEFT,
                verticalAnchor: VERTICAL_ALIGN.BASELINE,
            }
    }
}

const getScreenPositionOverTime = ({
    motion,
    animationPlan,
}: {
    motion: TSquaddieActionAnimationMotion
    animationPlan: SquaddieActionAnimationPlan
}): {
    x: CurveInterpolation
    y: CurveInterpolation
} => {
    const showResultTime =
        SquaddieActionAnimationPlanService.getTimeToShowResults({
            animationPlan,
        }) ??
        SquaddieActionAnimationEventTiming.melee
            .attackerMovesTowardsTargetBeforeHitting

    switch (motion) {
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeHitting,
                            ScreenDimensions.SCREEN_WIDTH / 2,
                        ],
                    },
                    easeIn: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeHitting * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeHitting * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 1,
                        amplitude: WINDOW_SPACING.SPACING1,
                        phaseShift: 0,
                        verticalShift: 0,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeHitting,
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.melee
                                .attackerHitsTarget,
                            ScreenDimensions.SCREEN_WIDTH / 12,
                        ],
                    },
                    easeOut: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerHitsTarget * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerHitsTarget * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 10,
                        amplitude: WINDOW_SPACING.SPACING1,
                        phaseShift: 0,
                        verticalShift: 0,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerHitsTarget * 0.2,
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 10,
                        amplitude: WINDOW_SPACING.SPACING2,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerPreparesACriticalHit,
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 10,
                        amplitude: WINDOW_SPACING.SPACING2,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerPreparesACriticalHit,
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeCriticallyHitting *
                                    0.5,
                                ScreenDimensions.SCREEN_WIDTH / 8,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeCriticallyHitting,
                                ScreenDimensions.SCREEN_WIDTH / 2,
                            ],
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeCriticallyHitting *
                                    0.25,
                                -ScreenDimensions.SCREEN_HEIGHT / 10,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeCriticallyHitting *
                                    0.8,
                                0,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES_BUT_WILL_MISS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeMissing,
                            (ScreenDimensions.SCREEN_WIDTH * 5) / 12,
                        ],
                    },
                    easeIn: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeMissing * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeMissing * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 1 / 0.8,
                        amplitude: WINDOW_SPACING.SPACING1,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeMissing * 0.8,
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_MISSES_AND_STOPS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 10,
                        amplitude: WINDOW_SPACING.SPACING1,
                        verticalShift: -WINDOW_SPACING.SPACING1,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMisses,
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_TARGET_DODGES_ATTACK:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency:
                            1 /
                            (2 *
                                SquaddieActionAnimationEventTiming.melee
                                    .targetDodges),
                        amplitude: ScreenDimensions.SCREEN_WIDTH / 12,
                        timeRange: [
                            0,
                            SquaddieActionAnimationEventTiming.melee
                                .targetDodges,
                        ],
                    },
                    easeOut: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .targetDodges * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .targetDodges * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .targetDodges * 0.3,
                                WINDOW_SPACING.SPACING4,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .targetDodges,
                                0,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES_BUT_WILL_MISS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing,
                            ScreenDimensions.SCREEN_WIDTH / 24,
                        ],
                    },
                    easeIn: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing *
                            0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing *
                            0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing,
                            ScreenDimensions.SCREEN_WIDTH / 24,
                        ],
                    },
                    easeOut: {
                        realTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing *
                            0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.melee
                                .attackerMovesTowardsTargetBeforeCriticallyMissing *
                            0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerCriticallyMisses,
                                WINDOW_SPACING.SPACING1 / 4,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerCriticallyMisses * 0.2,
                                WINDOW_SPACING.SPACING1,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.MELEE_TARGET_IGNORES_ATTACK:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
            }
        case SquaddieActionAnimationMotion.ACTOR_MOVES_TO_ASSIST_TARGET:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.assist
                                .assistantMoveToTargetTime,
                            ScreenDimensions.SCREEN_WIDTH / 6,
                        ],
                    },
                    easeIn: {
                        realTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantMoveToTargetTime * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantMoveToTargetTime * 0.1,
                    },
                    easeOut: {
                        realTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantMoveToTargetTime * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantMoveToTargetTime * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.assist
                                    .assistantMoveToTargetTime * 0.2,
                                -WINDOW_SPACING.SPACING1,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.assist
                                    .assistantMoveToTargetTime,
                                0,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.ACTOR_REACHES_TARGET_AND_ASSISTS:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime,
                            ScreenDimensions.SCREEN_WIDTH / 24,
                        ],
                    },
                    easeIn: {
                        realTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime * 0.1,
                    },
                    easeOut: {
                        realTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime * 0.2,
                        formulaTime:
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime * 0.1,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
            }
        case SquaddieActionAnimationMotion.TARGET_REALIZES_THEY_ARE_UNDER_ATTACK:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            showResultTime,
                            ScreenDimensions.SCREEN_WIDTH / 24,
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeHitting *
                                    0.5 *
                                    0.2,
                                -WINDOW_SPACING.SPACING1 / 2,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.melee
                                    .attackerMovesTowardsTargetBeforeHitting *
                                    0.2,
                                0,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.TARGET_IS_DEFEATED:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            showResultTime +
                                SquaddieActionAnimationEventTiming.melee
                                    .targetIsDefeated,
                            ScreenDimensions.SCREEN_WIDTH / 12,
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                (showResultTime +
                                    SquaddieActionAnimationEventTiming.melee
                                        .targetIsDefeated) *
                                    0.5,
                                -ScreenDimensions.SCREEN_HEIGHT * 0.1,
                            ],
                            [
                                showResultTime +
                                    SquaddieActionAnimationEventTiming.melee
                                        .targetIsDefeated,
                                ScreenDimensions.SCREEN_HEIGHT,
                            ],
                        ],
                    },
                }),
            }
        case SquaddieActionAnimationMotion.TARGET_IS_STRUCK:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            showResultTime +
                                SquaddieActionAnimationEventTiming.melee
                                    .targetIsStruck,
                            ScreenDimensions.SCREEN_WIDTH / 24,
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.SINE,
                        frequency: 1,
                        amplitude: WINDOW_SPACING.SPACING1,
                        phaseShift: 0,
                        verticalShift: 0,
                        timeRange: [
                            0,
                            showResultTime +
                                SquaddieActionAnimationEventTiming.melee
                                    .targetIsStruck,
                        ],
                    },
                    easeOut: {
                        realTime:
                            (showResultTime +
                                SquaddieActionAnimationEventTiming.melee
                                    .targetIsStruck) *
                            0.4,
                        formulaTime:
                            (showResultTime +
                                SquaddieActionAnimationEventTiming.melee
                                    .targetIsStruck) *
                            0.2,
                    },
                }),
            }
        case SquaddieActionAnimationMotion.TARGET_IS_ASSISTED:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.LINEAR,
                        startPoint: [0, 0],
                        endPoint: [
                            SquaddieActionAnimationEventTiming.assist
                                .assistantAssistTime,
                            -ScreenDimensions.SCREEN_WIDTH / 36,
                        ],
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.QUADRATIC,
                        points: [
                            [0, 0],
                            [
                                SquaddieActionAnimationEventTiming.assist
                                    .assistantAssistTime *
                                    0.3 *
                                    0.2,
                                -WINDOW_SPACING.SPACING1 / 2,
                            ],
                            [
                                SquaddieActionAnimationEventTiming.assist
                                    .assistantAssistTime * 0.3,
                                0,
                            ],
                        ],
                    },
                }),
            }
        default:
            return {
                x: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
                y: CurveInterpolationService.new({
                    formulaSettings: {
                        type: InterpolationTypeEnum.CONSTANT,
                        value: 0,
                    },
                }),
            }
    }
}
