import { describe, expect, it } from "vitest"
import { EventTriggerService } from "./eventTrigger"

describe("EventTrigger", () => {
    describe("Sanitize", () => {
        it("throws an error if triggeringEventType is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                EventTriggerService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("triggeringEventType")
        })
    })
})
