import { TriggeringEventType } from "./triggeringEventType"

export interface EventTrigger {
    triggeringEventType: TriggeringEventType
    systemReactedToTrigger: boolean
}

export const EventTriggerService = {
    sanitize: (eventTrigger: EventTrigger) => {
        if (!eventTrigger.triggeringEventType) {
            throw new Error("triggeringEventType is undefined")
        }
        eventTrigger.systemReactedToTrigger ||= false
    },
}
