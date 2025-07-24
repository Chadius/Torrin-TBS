import {
    EventTrigger,
    EventTriggerService,
} from "../battle/eventTrigger/eventTrigger"
import { TriggeringEventType } from "../battle/eventTrigger/triggeringEventType"
import { EventTriggerTurnRange } from "../battle/eventTrigger/eventTriggerTurnRange"
import { EventTriggerSquaddie } from "../battle/eventTrigger/eventTriggerSquaddie"
import { EventTriggerSquaddieQueryService } from "../battle/eventTrigger/eventTriggerSquaddieQuery"

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
    extends EventTrigger,
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
            systemReactedToTrigger: false,
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
    EventTriggerService.sanitize(cutscene)
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
        cutscene.targetingSquaddie = EventTriggerSquaddieQueryService.new()
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
