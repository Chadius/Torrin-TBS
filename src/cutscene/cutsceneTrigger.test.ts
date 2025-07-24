import { describe, expect, it } from "vitest"
import {
    CutsceneTriggerIdService,
    CutsceneTriggerService,
    SquaddieIsDefeatedTrigger,
    SquaddieIsInjuredTrigger,
} from "./cutsceneTrigger"
import { TriggeringEventType } from "../battle/eventTrigger/triggeringEventType"

describe("CutsceneTrigger", () => {
    describe("Sanitize", () => {
        it("will add empty fields for injured squaddie events", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: SquaddieIsInjuredTrigger = {
                triggeringEventType: TriggeringEventType.SQUADDIE_IS_INJURED,
                cutsceneId: "cutsceneId",
            }
            CutsceneTriggerService.sanitize(incompleteEvent)
            expect(
                incompleteEvent.targetingSquaddie.battleSquaddieIds
            ).toHaveLength(0)
        })

        it("will add empty fields for defeated squaddie events", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: SquaddieIsDefeatedTrigger = {
                triggeringEventType: TriggeringEventType.SQUADDIE_IS_DEFEATED,
                cutsceneId: "cutsceneId",
            }
            CutsceneTriggerService.sanitize(incompleteEvent)
            expect(
                incompleteEvent.targetingSquaddie.battleSquaddieIds
            ).toHaveLength(0)
            expect(
                incompleteEvent.targetingSquaddie.squaddieTemplateIds
            ).toHaveLength(0)
        })
    })
})

describe("CutsceneTriggerId", () => {
    describe("Sanitize", () => {
        it("throws an error if cutsceneId is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                CutsceneTriggerIdService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("cutsceneId")
        })
    })
})
