import { describe, expect, it } from "vitest"
import {
    EventTriggerSquaddie,
    EventTriggerSquaddieService,
} from "./eventTriggerSquaddie"
import {
    EventTriggerSquaddieQuery,
    EventTriggerSquaddieQueryService,
} from "./eventTriggerSquaddieQuery"

describe("EventTriggerSquaddie", () => {
    describe("Sanitize", () => {
        it("will add empty fields for missing squaddie ids", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: EventTriggerSquaddie = {}
            EventTriggerSquaddieService.sanitize(incompleteEvent)
            expect(
                incompleteEvent.targetingSquaddie.battleSquaddieIds
            ).toHaveLength(0)
            expect(
                incompleteEvent.targetingSquaddie.squaddieTemplateIds
            ).toHaveLength(0)
        })
    })

    describe("isValidTrigger", () => {
        it("knows the trigger is valid if there are squaddies to check against", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: ["battleSquaddieId"],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.isValidTrigger(eventTrigger)
            ).toBe(true)
        })
        it("knows the trigger is invalid if there are no squaddies to check against", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: [],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.isValidTrigger(eventTrigger)
            ).toBe(false)
        })
    })
})
