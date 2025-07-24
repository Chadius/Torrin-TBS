export interface EventTriggerSquaddieQuery {
    battleSquaddieIds: string[]
    squaddieTemplateIds: string[]
}

export const EventTriggerSquaddieQueryService = {
    new: () => {
        return sanitizeEventTriggerSquaddieQuery({
            battleSquaddieIds: [],
            squaddieTemplateIds: [],
        })
    },
    sanitize: (eventTrigger: EventTriggerSquaddieQuery) => {
        eventTrigger.battleSquaddieIds ||= []
        eventTrigger.squaddieTemplateIds ||= []
    },
    isValidTrigger: (eventTrigger: EventTriggerSquaddieQuery): boolean =>
        isQueryValidTrigger(eventTrigger),
    hasAtLeastOneBattleSquaddieId: ({
        eventTrigger,
        battleSquaddieIds,
    }: {
        eventTrigger: EventTriggerSquaddieQuery
        battleSquaddieIds: string[]
    }): boolean =>
        !isQueryValidTrigger(eventTrigger) ||
        eventTrigger.battleSquaddieIds.some((id) =>
            battleSquaddieIds.includes(id)
        ),
    hasAtLeastOneSquaddieTemplateId: ({
        eventTrigger,
        squaddieTemplateIds,
    }: {
        eventTrigger: EventTriggerSquaddieQuery
        squaddieTemplateIds: string[]
    }): boolean =>
        !isQueryValidTrigger(eventTrigger) ||
        eventTrigger.squaddieTemplateIds.some((id) =>
            squaddieTemplateIds.includes(id)
        ),
}
const sanitizeEventTriggerSquaddieQuery = (
    eventTrigger: EventTriggerSquaddieQuery
): EventTriggerSquaddieQuery => {
    eventTrigger.battleSquaddieIds ||= []
    eventTrigger.squaddieTemplateIds ||= []
    return eventTrigger
}
const isQueryValidTrigger = (
    eventTrigger: EventTriggerSquaddieQuery
): boolean =>
    eventTrigger &&
    (eventTrigger.battleSquaddieIds?.length > 0 ||
        eventTrigger.squaddieTemplateIds?.length > 0)
