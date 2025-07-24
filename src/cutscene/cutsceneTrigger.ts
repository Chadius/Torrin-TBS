import {
    EventTriggerBase,
    EventTriggerBaseService,
} from "../battle/eventTrigger/eventTriggerBase"
import { TriggeringEventType } from "../battle/eventTrigger/triggeringEventType"
import { EventTriggerTurnRange } from "../battle/eventTrigger/eventTriggerTurnRange"
import { EventTriggerSquaddie } from "../battle/eventTrigger/eventTriggerSquaddie"
import { EventTriggerSquaddieQueryService } from "../battle/eventTrigger/eventTriggerSquaddieQuery"

import { BattleEventEffectState } from "../battle/event/battleEventEffectState"

export interface CutsceneTriggerId {
    cutsceneId: string
}

export const CutsceneTriggerIdService = {
    sanitize: (cutscene: CutsceneTriggerId) => {
        if (!cutscene.cutsceneId) {
            throw new Error("Cutscene cutsceneId is undefined")
        }
    },
}

export interface CutsceneTrigger
    extends EventTriggerBase,
        BattleEventEffectState,
        CutsceneTriggerId,
        EventTriggerTurnRange,
        EventTriggerSquaddie {}

export const CutsceneTriggerService = {
    new: ({
        triggeringEventType,
        cutsceneId,
    }: {
        triggeringEventType: TriggeringEventType
        cutsceneId: string
    }) => {
        return sanitizeCutsceneTriggerService({
            triggeringEventType: triggeringEventType,
            alreadyAppliedEffect: false,
            cutsceneId,
            targetingSquaddie: undefined,
        })
    },
    sanitize: (cutscene: CutsceneTrigger) =>
        sanitizeCutsceneTriggerService(cutscene),
}

const sanitizeCutsceneTriggerService = (
    cutscene: CutsceneTrigger
): CutsceneTrigger => {
    EventTriggerBaseService.sanitize(cutscene)
    CutsceneTriggerIdService.sanitize(cutscene)

    switch (cutscene.triggeringEventType) {
        case TriggeringEventType.SQUADDIE_IS_INJURED:
        case TriggeringEventType.SQUADDIE_IS_DEFEATED:
            sanitizeSquaddieFields(cutscene)
    }
    return cutscene
}

export interface SquaddieIsInjuredTrigger
    extends CutsceneTrigger,
        CutsceneTriggerId,
        EventTriggerTurnRange,
        EventTriggerSquaddie {
    readonly triggeringEventType: TriggeringEventType.SQUADDIE_IS_INJURED
}

const sanitizeSquaddieFields = (cutscene: EventTriggerSquaddie) => {
    if (!cutscene.targetingSquaddie) {
        cutscene.targetingSquaddie = EventTriggerSquaddieQueryService.new({})
    }
    EventTriggerSquaddieQueryService.sanitize(cutscene.targetingSquaddie)
    return cutscene
}

export interface SquaddieIsDefeatedTrigger
    extends CutsceneTrigger,
        CutsceneTriggerId,
        EventTriggerTurnRange,
        EventTriggerSquaddie {
    readonly triggeringEventType: TriggeringEventType.SQUADDIE_IS_DEFEATED
}
