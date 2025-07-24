import {
    EventTriggerSquaddieQuery,
    EventTriggerSquaddieQueryService,
} from "./eventTriggerSquaddieQuery"

export interface EventTriggerSquaddie {
    targetingSquaddie: EventTriggerSquaddieQuery
}

export const EventTriggerSquaddieService = {
    sanitize: (eventTrigger: EventTriggerSquaddie) => {
        eventTrigger.targetingSquaddie = EventTriggerSquaddieQueryService.new()
        sanitizeEventTriggerSquaddie(eventTrigger)
    },
    isValidTrigger: (eventTrigger: EventTriggerSquaddie): boolean =>
        isValidTrigger(eventTrigger),
    targetingHasAtLeastOneBattleSquaddieId: ({
        eventTrigger,
        battleSquaddieIds,
    }: {
        eventTrigger: EventTriggerSquaddie
        battleSquaddieIds: string[]
    }): boolean =>
        !isValidTrigger(eventTrigger) ||
        EventTriggerSquaddieQueryService.hasAtLeastOneBattleSquaddieId({
            eventTrigger: eventTrigger.targetingSquaddie,
            battleSquaddieIds,
        }),
    targetingHasAtLeastOneSquaddieTemplateId: ({
        eventTrigger,
        squaddieTemplateIds,
    }: {
        eventTrigger: EventTriggerSquaddie
        squaddieTemplateIds: string[]
    }): boolean =>
        !isValidTrigger(eventTrigger) ||
        EventTriggerSquaddieQueryService.hasAtLeastOneSquaddieTemplateId({
            eventTrigger: eventTrigger.targetingSquaddie,
            squaddieTemplateIds,
        }),
}
const sanitizeEventTriggerSquaddie = (eventTrigger: EventTriggerSquaddie) => {
    EventTriggerSquaddieQueryService.sanitize(eventTrigger.targetingSquaddie)
}
const isValidTrigger = (eventTrigger: EventTriggerSquaddie): boolean =>
    eventTrigger &&
    eventTrigger.targetingSquaddie &&
    EventTriggerSquaddieQueryService.isValidTrigger(
        eventTrigger.targetingSquaddie
    )
