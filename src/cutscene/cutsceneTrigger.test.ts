import { describe, expect, it } from "vitest"
import {
    CutsceneTriggerService,
    SquaddieIsDefeatedTrigger,
    SquaddieIsInjuredTrigger,
    TriggeringEvent,
} from "./cutsceneTrigger"

describe("CutsceneTrigger", () => {
    describe("Sanitize", () => {
        it("throws an error if triggeringEvent is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                CutsceneTriggerService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("triggeringEvent")
        })

        it("throws an error if cutsceneId is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                CutsceneTriggerService.sanitize({
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                })
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("cutsceneId")
        })

        it("will add empty fields for injured squaddie events", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: SquaddieIsInjuredTrigger = {
                triggeringEvent: TriggeringEvent.SQUADDIE_IS_INJURED,
                cutsceneId: "cutsceneId",
            }
            CutsceneTriggerService.sanitize(incompleteEvent)
            expect(incompleteEvent.battleSquaddieIds).toHaveLength(0)
        })

        it("will add empty fields for defeated squaddie events", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: SquaddieIsDefeatedTrigger = {
                triggeringEvent: TriggeringEvent.SQUADDIE_IS_DEFEATED,
                cutsceneId: "cutsceneId",
            }
            CutsceneTriggerService.sanitize(incompleteEvent)
            expect(incompleteEvent.battleSquaddieIds).toHaveLength(0)
            expect(incompleteEvent.squaddieTemplateIds).toHaveLength(0)
        })
    })
})
