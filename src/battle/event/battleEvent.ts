import { EventTriggerBase } from "../eventTrigger/eventTriggerBase"
import {
    EventTriggerSquaddie,
    EventTriggerSquaddieService,
} from "../eventTrigger/eventTriggerSquaddie"
import {
    EventTriggerTurnRange,
    EventTriggerTurnRangeService,
} from "../eventTrigger/eventTriggerTurnRange"
import { TriggeringEventType } from "../eventTrigger/triggeringEventType"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import {
    EventBattleProgress,
    EventBattleProgressService,
} from "../eventTrigger/eventBattleProgress"
import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "./battleEventEffectState"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"

export type BattleEventEffect = CutsceneEffect

type BattleEventTrigger =
    | (EventTriggerBase & EventTriggerSquaddie)
    | (EventTriggerBase & EventTriggerTurnRange)
    | (EventTriggerBase & EventBattleProgress)

export interface BattleEvent {
    triggers: BattleEventTrigger[]
    effect: BattleEventEffect & BattleEventEffectState
}

export const BattleEventService = {
    new: ({
        triggers,
        effect,
    }: {
        triggers: BattleEventTrigger[]
        effect: BattleEventEffect
    }): BattleEvent => {
        return sanitize({
            triggers,
            effect,
        })
    },
    sanitize: (event: BattleEvent): BattleEvent => sanitize(event),
    areTriggersSatisfied: ({
        battleEvent,
        context: { squaddies, turnCount, battleCompletionStatus },
    }: {
        battleEvent: BattleEvent
        context: {
            turnCount?: number
            battleCompletionStatus?: BattleCompletionStatus
            squaddies?: {
                injured?: {
                    battleSquaddieIds: string[]
                    squaddieTemplateIds: string[]
                }
                defeated?: {
                    battleSquaddieIds: string[]
                    squaddieTemplateIds: string[]
                }
            }
        }
    }): boolean => {
        if (!isValidValue(battleEvent)) return false

        return battleEvent.triggers.every((eventTrigger) => {
            switch (eventTrigger.triggeringEventType) {
                case TriggeringEventType.START_OF_TURN:
                    return EventTriggerTurnRangeService.shouldTrigger({
                        eventTrigger: eventTrigger as EventTriggerTurnRange,
                        turnCount,
                    })
                case TriggeringEventType.SQUADDIE_IS_DEFEATED:
                    return (
                        squaddies?.defeated &&
                        EventTriggerSquaddieService.shouldTrigger({
                            eventTrigger: eventTrigger as EventTriggerSquaddie,
                            targetingSquaddie: squaddies.defeated,
                        })
                    )
                case TriggeringEventType.SQUADDIE_IS_INJURED:
                    return (
                        squaddies?.injured &&
                        EventTriggerSquaddieService.shouldTrigger({
                            eventTrigger: eventTrigger as EventTriggerSquaddie,
                            targetingSquaddie: squaddies.injured,
                        })
                    )
                case TriggeringEventType.MISSION_DEFEAT:
                case TriggeringEventType.MISSION_VICTORY:
                    return EventBattleProgressService.shouldTrigger({
                        eventTrigger: eventTrigger as EventBattleProgress,
                        battleCompletionStatus,
                    })
            }
        })
    },
}

const sanitize = (event: BattleEvent): BattleEvent => {
    if (!event) {
        throw new Error("BattleEvent cannot be undefined")
    }
    if (!event.triggers || event.triggers.length === 0) {
        throw new Error("BattleEvent.triggers must have at least one trigger")
    }
    if (!event.effect) {
        throw new Error("BattleEvent.effect cannot be undefined")
    }

    const invalidTriggerIndexes = event.triggers
        .map((trigger, index) => {
            let isValidTrigger: boolean = false
            switch (trigger.triggeringEventType) {
                case TriggeringEventType.START_OF_TURN:
                    isValidTrigger =
                        EventTriggerTurnRangeService.isValidTrigger(
                            trigger as EventTriggerTurnRange
                        )
                    break
                case TriggeringEventType.SQUADDIE_IS_DEFEATED:
                case TriggeringEventType.SQUADDIE_IS_INJURED:
                    isValidTrigger = EventTriggerSquaddieService.isValidTrigger(
                        trigger as EventTriggerSquaddie
                    )
                    break
                case TriggeringEventType.MISSION_DEFEAT:
                case TriggeringEventType.MISSION_VICTORY:
                    isValidTrigger = true
                    break
            }

            return isValidTrigger ? undefined : index
        })
        .filter((x) => x != undefined)

    if (invalidTriggerIndexes.length > 0) {
        throw new Error(
            `BattleEvent.triggers has an invalid trigger: ${[...invalidTriggerIndexes]}`
        )
    }

    event.triggers = event.triggers.map((trigger) => {
        switch (trigger.triggeringEventType) {
            case TriggeringEventType.SQUADDIE_IS_INJURED:
            case TriggeringEventType.SQUADDIE_IS_DEFEATED:
                return {
                    ...trigger,
                    ...EventTriggerSquaddieService.sanitize(
                        trigger as EventTriggerSquaddie
                    ),
                }
            case TriggeringEventType.MISSION_DEFEAT:
            case TriggeringEventType.MISSION_VICTORY:
                return {
                    ...trigger,
                    ...EventBattleProgressService.sanitize(
                        trigger as EventBattleProgress
                    ),
                }
            default:
                return trigger
        }
    })
    BattleEventEffectStateService.sanitize(event.effect)
    return event
}
