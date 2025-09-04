import { TTriggeringEvent } from "./triggeringEvent"

export interface EventTriggerBase {
    triggeringEventType: TTriggeringEvent
    alreadyAppliedEffect: boolean
}

export const EventTriggerBaseService = {
    new: (type: TTriggeringEvent): EventTriggerBase =>
        sanitize({
            triggeringEventType: type,
            alreadyAppliedEffect: false,
        }),
    sanitize: (eventTrigger: EventTriggerBase) => sanitize(eventTrigger),
}

const sanitize = (eventTrigger: EventTriggerBase) => {
    if (!eventTrigger.triggeringEventType) {
        throw new Error("triggeringEventType is undefined")
    }
    eventTrigger.alreadyAppliedEffect ||= false
    return eventTrigger
}
