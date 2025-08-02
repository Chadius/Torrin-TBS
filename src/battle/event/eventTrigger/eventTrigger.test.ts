import { describe, expect, it } from "vitest"
import { EventTriggerBaseService } from "./eventTriggerBase"

describe("EventTrigger", () => {
    describe("Sanitize", () => {
        it("throws an error if triggeringEventType is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                EventTriggerBaseService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("triggeringEventType")
        })
    })
})
