import { EventTriggerBase } from "./eventTrigger/eventTriggerBase"
import {
    EventTriggerSquaddie,
    EventTriggerSquaddieService,
} from "./eventTrigger/eventTriggerSquaddie"
import {
    EventTriggerTurnRange,
    EventTriggerTurnRangeService,
} from "./eventTrigger/eventTriggerTurnRange"
import { TriggeringEvent } from "./eventTrigger/triggeringEvent"
import { isValidValue } from "../../utils/objectValidityCheck"
import { TBattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import {
    EventTriggerBattleCompletionStatus,
    EventTriggerBattleCompletionStatusService,
} from "./eventTrigger/eventTriggerBattleCompletionStatus"
import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "./battleEventEffectState"
import {
    CutsceneEffect,
    CutsceneEffectService,
} from "../../cutscene/cutsceneEffect"
import { ChallengeModifierEffect } from "./eventEffect/challengeModifierEffect/challengeModifierEffect"
import { BattleEventEffect } from "./battleEventEffect"

export type BattleEventEffect = CutsceneEffect | ChallengeModifierEffect

type BattleEventTrigger =
    | (EventTriggerBase & EventTriggerSquaddie)
    | (EventTriggerBase & EventTriggerTurnRange)
    | (EventTriggerBase & EventTriggerBattleCompletionStatus)

export interface BattleEvent {
    triggers: BattleEventTrigger[]
    effect: BattleEventEffect & BattleEventEffectState
}

export type BattleEventTriggerSquaddiesContext = {
    injured?: {
        battleSquaddieIds: string[]
        squaddieTemplateIds: string[]
    }
    defeated?: {
        battleSquaddieIds: string[]
        squaddieTemplateIds: string[]
    }
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
        context: { squaddies, turn, battleCompletionStatus },
    }: {
        battleEvent: BattleEvent
        context: {
            turn?: {
                turnCount?: number
                ignoreTurn0?: boolean
            }
            battleCompletionStatus?: TBattleCompletionStatus
            squaddies?: BattleEventTriggerSquaddiesContext
        }
    }): boolean => {
        if (!isValidValue(battleEvent)) return false

        return battleEvent.triggers.every((eventTrigger) => {
            switch (eventTrigger.triggeringEventType) {
                case TriggeringEvent.START_OF_TURN:
                    return EventTriggerTurnRangeService.shouldTrigger({
                        eventTrigger: eventTrigger as EventTriggerTurnRange,
                        turnCount: turn?.turnCount,
                        ignoreTurn0: turn?.ignoreTurn0,
                    })
                case TriggeringEvent.SQUADDIE_IS_DEFEATED:
                    return (
                        squaddies?.defeated &&
                        EventTriggerSquaddieService.shouldTrigger({
                            eventTrigger: eventTrigger as EventTriggerSquaddie,
                            targetingSquaddie: squaddies.defeated,
                        })
                    )
                case TriggeringEvent.SQUADDIE_IS_INJURED:
                    return (
                        squaddies?.injured &&
                        EventTriggerSquaddieService.shouldTrigger({
                            eventTrigger: eventTrigger as EventTriggerSquaddie,
                            targetingSquaddie: squaddies.injured,
                        })
                    )
                case TriggeringEvent.MISSION_DEFEAT:
                case TriggeringEvent.MISSION_VICTORY:
                    return EventTriggerBattleCompletionStatusService.shouldTrigger(
                        {
                            eventTrigger:
                                eventTrigger as EventTriggerBattleCompletionStatus,
                            battleCompletionStatus,
                        }
                    )
            }
        })
    },
    getCutsceneId: (battleEvent: BattleEvent): string | undefined => {
        if (CutsceneEffectService.isCutscene(battleEvent.effect))
            return battleEvent.effect.cutsceneId
        return undefined
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
                case TriggeringEvent.START_OF_TURN:
                    isValidTrigger =
                        EventTriggerTurnRangeService.isValidTrigger(
                            trigger as EventTriggerTurnRange
                        )
                    break
                case TriggeringEvent.SQUADDIE_IS_DEFEATED:
                case TriggeringEvent.SQUADDIE_IS_INJURED:
                    isValidTrigger = EventTriggerSquaddieService.isValidTrigger(
                        trigger as EventTriggerSquaddie
                    )
                    break
                case TriggeringEvent.MISSION_DEFEAT:
                case TriggeringEvent.MISSION_VICTORY:
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
            case TriggeringEvent.SQUADDIE_IS_INJURED:
            case TriggeringEvent.SQUADDIE_IS_DEFEATED:
                return {
                    ...trigger,
                    ...EventTriggerSquaddieService.sanitize(
                        trigger as EventTriggerSquaddie
                    ),
                }
            case TriggeringEvent.MISSION_DEFEAT:
            case TriggeringEvent.MISSION_VICTORY:
                return {
                    ...trigger,
                    ...EventTriggerBattleCompletionStatusService.sanitize(
                        trigger as EventTriggerBattleCompletionStatus
                    ),
                }
            default:
                return trigger
        }
    })
    BattleEventEffectStateService.sanitize(event.effect)
    return event
}
