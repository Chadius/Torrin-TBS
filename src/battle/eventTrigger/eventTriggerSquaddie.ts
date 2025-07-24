import {
    EventTriggerSquaddieQuery,
    EventTriggerSquaddieQueryService,
} from "./eventTriggerSquaddieQuery"

export interface EventTriggerSquaddie {
    targetingSquaddie: EventTriggerSquaddieQuery
}

export const EventTriggerSquaddieService = {
    new: ({
        targetingSquaddie,
    }: {
        targetingSquaddie: EventTriggerSquaddieQuery
    }): EventTriggerSquaddie => {
        return sanitizeEventTriggerSquaddie({
            targetingSquaddie: targetingSquaddie,
        })
    },
    sanitize: (eventTrigger: EventTriggerSquaddie) => {
        eventTrigger.targetingSquaddie ||= EventTriggerSquaddieQueryService.new(
            {}
        )
        return sanitizeEventTriggerSquaddie(eventTrigger)
    },
    isValidTrigger: (eventTrigger: EventTriggerSquaddie): boolean =>
        isValidTrigger(eventTrigger),
    shouldTrigger: ({
        eventTrigger,
        targetingSquaddie,
    }: {
        eventTrigger: EventTriggerSquaddie
        targetingSquaddie: {
            battleSquaddieIds: string[]
            squaddieTemplateIds: string[]
        }
    }): boolean => {
        return (
            EventTriggerSquaddieQueryService.hasAtLeastOneBattleSquaddieId({
                eventTrigger: eventTrigger.targetingSquaddie,
                battleSquaddieIds: targetingSquaddie.battleSquaddieIds,
            }) ||
            EventTriggerSquaddieQueryService.hasAtLeastOneSquaddieTemplateId({
                eventTrigger: eventTrigger.targetingSquaddie,
                squaddieTemplateIds: targetingSquaddie.squaddieTemplateIds,
            })
        )
    },
}
const sanitizeEventTriggerSquaddie = (
    eventTrigger: EventTriggerSquaddie
): EventTriggerSquaddie => {
    EventTriggerSquaddieQueryService.sanitize(eventTrigger.targetingSquaddie)
    return eventTrigger
}
const isValidTrigger = (eventTrigger: EventTriggerSquaddie): boolean =>
    eventTrigger &&
    eventTrigger.targetingSquaddie &&
    EventTriggerSquaddieQueryService.isValidTrigger(
        eventTrigger.targetingSquaddie
    )
