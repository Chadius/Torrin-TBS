import {
    SquaddieEmotion,
    TSquaddieEmotion,
} from "../../actionAnimationConstants"
import { EnumLike } from "../../../../../utils/enum"
import { BattleAction } from "../../../../history/battleAction/battleAction"
import { DegreeOfSuccess } from "../../../../calculator/actionCalculator/degreeOfSuccess"
import { BattleActionSquaddieChange } from "../../../../history/battleAction/battleActionSquaddieChange"

export const SquaddieActionAnimationMotion = {
    STANDING_IDLE: "STANDING_IDLE",

    MELEE_ATTACKER_LUNGES: "MELEE_ATTACKER",
    MELEE_ATTACKER_HITS: "MELEE_ATTACKER_HITS",
    MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT:
        "MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT",
    MELEE_ATTACKER_CRITICALLY_LUNGES: "MELEE_ATTACKER_CRITICALLY_LUNGES",
    MELEE_ATTACKER_LUNGES_BUT_WILL_MISS: "MELEE_ATTACKER_LUNGES_BUT_WILL_MISS",
    MELEE_ATTACKER_MISSES_AND_STOPS: "MELEE_ATTACKER_MISSES_AND_STOPS",
    MELEE_TARGET_DODGES_ATTACK: "MELEE_TARGET_DODGES_ATTACK",
    MELEE_ATTACKER_CRITICALLY_LUNGES_BUT_WILL_MISS:
        "MELEE_ATTACKER_CRITICALLY_LUNGES_BUT_WILL_MISS",
    MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS:
        "MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS",
    MELEE_TARGET_IGNORES_ATTACK: "MELEE_TARGET_IGNORES_ATTACK",

    ACTOR_MOVES_TO_ASSIST_TARGET: "ACTOR_MOVES_TO_ASSIST_TARGET",
    ACTOR_REACHES_TARGET_AND_ASSISTS: "ACTOR_REACHES_TARGET_AND_ASSISTS",

    TARGET_REALIZES_THEY_ARE_UNDER_ATTACK:
        "TARGET_REALIZES_THEY_ARE_UNDER_ATTACK",
    TARGET_IS_DEFEATED: "TARGET_IS_DEFEATED",
    TARGET_IS_STRUCK: "TARGET_IS_STRUCK",
    TARGET_IS_ASSISTED: "TARGET_IS_ASSISTED",
} as const satisfies Record<string, string>
export type TSquaddieActionAnimationMotion = EnumLike<
    typeof SquaddieActionAnimationMotion
>

export interface SquaddieActionAnimationEvent {
    startTime: number
    battleSquaddieId: string
    squaddieEmotion: TSquaddieEmotion
    motion: TSquaddieActionAnimationMotion
}

export const SquaddieActionAnimationEventTiming = {
    melee: {
        attackerMovesTowardsTargetBeforeHitting: 500,
        attackerMovesTowardsTargetBeforeMissing: 500,
        attackerHitsTarget: 300,
        attackerMisses: 300,
        attackerCriticallyMisses: 300,
        attackerPreparesACriticalHit: 200,
        attackerMovesTowardsTargetBeforeCriticallyHitting: 300,
        attackerMovesTowardsTargetBeforeCriticallyMissing: 100,
        attackerCriticallyHitsTarget: 300,
        targetDodges: 100,
        targetIgnoreCriticalMiss: 100,
        targetIsStruck: 200,
        targetIsDefeated: 500,
    },
    assist: {
        assistantMoveToTargetTime: 500,
        assistantAssistTime: 500,
    },
}

export const SquaddieActionAnimationEventService = {
    createMeleeAttackerEvents: ({
        battleSquaddieId,
        battleAction,
    }: {
        battleSquaddieId: string
        battleAction: BattleAction
    }) => createMeleeAttackerEvents({ battleSquaddieId, battleAction }),
    createMeleeTargetEvents: ({
        battleSquaddieId,
        squaddieEffect,
        battleAction,
    }: {
        battleSquaddieId: string
        squaddieEffect: BattleActionSquaddieChange
        battleAction: BattleAction
    }) =>
        createMeleeTargetEvents({
            battleSquaddieId,
            squaddieEffect,
            battleAction,
        }),
    createAssistAssistantEvents: ({
        battleSquaddieId,
    }: {
        battleSquaddieId: string
        battleAction: BattleAction
    }) => createAssistAssistantEvents({ battleSquaddieId }),
    createAssistTargetEvents: ({
        battleSquaddieId,
    }: {
        battleSquaddieId: string
    }) =>
        createAssistTargetEvents({
            battleSquaddieId,
        }),
}

const didAttackerCriticallySucceed = (battleAction: BattleAction) => {
    return battleAction.effect.squaddie?.some(
        (effect) =>
            effect.actorDegreeOfSuccess == DegreeOfSuccess.CRITICAL_SUCCESS
    )
}

const didAttackerSucceed = (battleAction: BattleAction) => {
    return battleAction.effect.squaddie?.some(
        (effect) => effect.actorDegreeOfSuccess == DegreeOfSuccess.SUCCESS
    )
}

const didAttackerFail = (battleAction: BattleAction) => {
    return battleAction.effect.squaddie?.some(
        (effect) => effect.actorDegreeOfSuccess == DegreeOfSuccess.FAILURE
    )
}

const didAttackerCriticallyFail = (battleAction: BattleAction) => {
    return battleAction.effect.squaddie?.some(
        (effect) =>
            effect.actorDegreeOfSuccess == DegreeOfSuccess.CRITICAL_FAILURE
    )
}

const createMeleeAttackerEvents = ({
    battleSquaddieId,
    battleAction,
}: {
    battleSquaddieId: string
    battleAction: BattleAction
}): SquaddieActionAnimationEvent[] => {
    if (didAttackerSucceed(battleAction))
        return createEventsMeleeAttackSucceeds({
            battleSquaddieId,
        })

    if (didAttackerCriticallySucceed(battleAction))
        return createEventsMeleeAttackCriticallySucceeds({
            battleSquaddieId,
        })

    if (didAttackerFail(battleAction))
        return createEventsMeleeAttackerMisses({
            battleSquaddieId,
        })

    if (didAttackerCriticallyFail(battleAction))
        return createEventsMeleeAttackerCriticallyMisses({
            battleSquaddieId,
        })
    return []
}

const createEventsMeleeAttackSucceeds = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.STANDING_IDLE,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeHitting,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeHitting +
                SquaddieActionAnimationEventTiming.melee.attackerHitsTarget,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
        },
    ]
}

const createEventsMeleeAttackCriticallySucceeds = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyHitting,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyHitting +
                SquaddieActionAnimationEventTiming.melee.attackerHitsTarget,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_HITS,
        },
    ]
}

const createMeleeTargetEvents = ({
    battleSquaddieId,
    squaddieEffect,
    battleAction,
}: {
    battleSquaddieId: string
    squaddieEffect: BattleActionSquaddieChange
    battleAction: BattleAction
}): SquaddieActionAnimationEvent[] => {
    const attackerImpactTime = calculateAttackerHitTime(battleAction)

    let afterStrikeEvents: SquaddieActionAnimationEvent[]
    switch (true) {
        case squaddieEffect.actorDegreeOfSuccess ==
            DegreeOfSuccess.CRITICAL_FAILURE:
            afterStrikeEvents = createEventsMeleeDefenderIgnoresCriticalMiss({
                battleSquaddieId,
                attackerImpactTime,
            })
            break
        case squaddieEffect.actorDegreeOfSuccess == DegreeOfSuccess.FAILURE:
            afterStrikeEvents = createEventsMeleeDefenderDodges({
                battleSquaddieId,
                attackerImpactTime,
            })
            break
        case squaddieEffect.damage.willKo:
            afterStrikeEvents = createEventsMeleeDefenderIsStruckAndDefeated({
                battleSquaddieId,
                attackerImpactTime,
            })
            break
        default:
            afterStrikeEvents = createEventsMeleeDefenderIsStruckButNotDefeated(
                { battleSquaddieId, attackerImpactTime }
            )
            break
    }

    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.STANDING_IDLE,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeHitting,
            squaddieEmotion: SquaddieEmotion.TARGETED,
            motion: SquaddieActionAnimationMotion.TARGET_REALIZES_THEY_ARE_UNDER_ATTACK,
        },
        ...afterStrikeEvents,
    ]
}

const calculateAttackerHitTime = (battleAction: BattleAction): number => {
    switch (true) {
        case didAttackerCriticallySucceed(battleAction):
            return (
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyHitting +
                SquaddieActionAnimationEventTiming.melee
                    .attackerCriticallyHitsTarget
            )
        case didAttackerSucceed(battleAction):
            return (
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeHitting +
                SquaddieActionAnimationEventTiming.melee.attackerHitsTarget
            )
        case didAttackerFail(battleAction):
            return (
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeMissing +
                SquaddieActionAnimationEventTiming.melee.attackerMisses
            )
        case didAttackerCriticallyFail(battleAction):
            return (
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyMissing +
                SquaddieActionAnimationEventTiming.melee
                    .attackerCriticallyMisses
            )
        default:
            return 0
    }
}

const createEventsMeleeDefenderIsStruckButNotDefeated = ({
    battleSquaddieId,
    attackerImpactTime,
}: {
    battleSquaddieId: string
    attackerImpactTime: number
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: attackerImpactTime,
            squaddieEmotion: SquaddieEmotion.DAMAGED,
            motion: SquaddieActionAnimationMotion.TARGET_IS_STRUCK,
        },
    ]
}

const createEventsMeleeDefenderIsStruckAndDefeated = ({
    battleSquaddieId,
    attackerImpactTime,
}: {
    battleSquaddieId: string
    attackerImpactTime: number
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: attackerImpactTime,
            squaddieEmotion: SquaddieEmotion.DEAD,
            motion: SquaddieActionAnimationMotion.TARGET_IS_DEFEATED,
        },
    ]
}

const createEventsMeleeDefenderDodges = ({
    battleSquaddieId,
    attackerImpactTime,
}: {
    battleSquaddieId: string
    attackerImpactTime: number
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime:
                attackerImpactTime -
                SquaddieActionAnimationEventTiming.melee.targetDodges,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.MELEE_TARGET_DODGES_ATTACK,
        },
    ]
}

const createEventsMeleeDefenderIgnoresCriticalMiss = ({
    battleSquaddieId,
    attackerImpactTime,
}: {
    battleSquaddieId: string
    attackerImpactTime: number
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime:
                attackerImpactTime -
                SquaddieActionAnimationEventTiming.melee
                    .targetIgnoreCriticalMiss,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.MELEE_TARGET_IGNORES_ATTACK,
        },
    ]
}

const createEventsMeleeAttackerMisses = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}) => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.STANDING_IDLE,
            startLocationOffset: { x: 0, y: 0 },
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeMissing,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_LUNGES_BUT_WILL_MISS,
            startLocationOffset: { x: 0, y: 0 },
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeMissing +
                SquaddieActionAnimationEventTiming.melee.attackerHitsTarget,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_MISSES_AND_STOPS,
            startLocationOffset: { x: 0, y: 0 },
        },
    ]
}

const createEventsMeleeAttackerCriticallyMisses = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_IS_PREPARING_CRITICAL_HIT,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyMissing,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_LUNGES_BUT_WILL_MISS,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.melee
                    .attackerMovesTowardsTargetBeforeCriticallyMissing +
                SquaddieActionAnimationEventTiming.melee.attackerHitsTarget,
            squaddieEmotion: SquaddieEmotion.ATTACK,
            motion: SquaddieActionAnimationMotion.MELEE_ATTACKER_CRITICALLY_MISSES_AND_STOPS,
        },
    ]
}

const createAssistAssistantEvents = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.STANDING_IDLE,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.assist
                    .assistantMoveToTargetTime,
            squaddieEmotion: SquaddieEmotion.ASSISTING,
            motion: SquaddieActionAnimationMotion.ACTOR_MOVES_TO_ASSIST_TARGET,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.assist
                    .assistantMoveToTargetTime +
                SquaddieActionAnimationEventTiming.assist.assistantAssistTime,
            squaddieEmotion: SquaddieEmotion.ASSISTING,
            motion: SquaddieActionAnimationMotion.ACTOR_REACHES_TARGET_AND_ASSISTS,
        },
    ]
}

const createAssistTargetEvents = ({
    battleSquaddieId,
}: {
    battleSquaddieId: string
}): SquaddieActionAnimationEvent[] => {
    return [
        {
            battleSquaddieId,
            startTime: 0,
            squaddieEmotion: SquaddieEmotion.NEUTRAL,
            motion: SquaddieActionAnimationMotion.STANDING_IDLE,
        },
        {
            battleSquaddieId,
            startTime:
                SquaddieActionAnimationEventTiming.assist
                    .assistantMoveToTargetTime +
                SquaddieActionAnimationEventTiming.assist.assistantAssistTime,
            squaddieEmotion: SquaddieEmotion.THANKFUL,
            motion: SquaddieActionAnimationMotion.TARGET_IS_ASSISTED,
        },
    ]
}
