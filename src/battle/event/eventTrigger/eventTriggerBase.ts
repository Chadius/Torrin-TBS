import { TriggeringEventType } from "./triggeringEventType"

export interface EventTriggerBase {
    triggeringEventType: TriggeringEventType
    alreadyAppliedEffect: boolean
}

export const EventTriggerBaseService = {
    new: (type: TriggeringEventType): EventTriggerBase =>
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
