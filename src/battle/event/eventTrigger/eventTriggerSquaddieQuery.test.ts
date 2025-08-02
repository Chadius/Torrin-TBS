import { describe, expect, it } from "vitest"
import {
    EventTriggerSquaddie,
    EventTriggerSquaddieService,
} from "./eventTriggerSquaddie"
import {
    EventTriggerSquaddieQuery,
    EventTriggerSquaddieQueryService,
} from "./eventTriggerSquaddieQuery"

describe("EventTriggerSquaddieQuery", () => {
    describe("Sanitize", () => {
        it("will add empty fields for missing squaddie ids", () => {
            // @ts-ignore Object is purposely missing expected fields
            const incompleteEvent: EventTriggerSquaddieQuery = {}
            EventTriggerSquaddieQueryService.sanitize(incompleteEvent)
            expect(incompleteEvent.battleSquaddieIds).toHaveLength(0)
            expect(incompleteEvent.squaddieTemplateIds).toHaveLength(0)
        })
    })

    describe("isValidTrigger", () => {
        it("knows the trigger is valid if there are squaddies to check against", () => {
            const eventTrigger: EventTriggerSquaddie = {
                targetingSquaddie: {
                    battleSquaddieIds: ["battleSquaddieId"],
                    squaddieTemplateIds: [],
                },
            }

            expect(
                EventTriggerSquaddieService.isValidTrigger(eventTrigger)
            ).toBe(true)
        })
        it("knows the trigger is invalid if there are no squaddies to check against", () => {
            const eventTrigger: EventTriggerSquaddie = {
                targetingSquaddie: {
                    battleSquaddieIds: [],
                    squaddieTemplateIds: [],
                },
            }

            expect(
                EventTriggerSquaddieService.isValidTrigger(eventTrigger)
            ).toBe(false)
        })
    })

    describe("hasAtLeastOneBattleSquaddieId", () => {
        it("passes if it has no battleSquaddieIds to filter", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: [],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneBattleSquaddieId({
                    eventTrigger,
                    battleSquaddieIds: ["battleSquaddieId"],
                })
            ).toBe(true)
        })
        it("passes if it the filter contains at least 1 battleSquaddieId", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: ["battleSquaddieId", "battleSquaddieId2"],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneBattleSquaddieId({
                    eventTrigger,
                    battleSquaddieIds: [
                        "battleSquaddieId",
                        "battleSquaddieId3",
                    ],
                })
            ).toBe(true)
        })
        it("fails if it the filter does not contain any matching battleSquaddieIds", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: ["battleSquaddieId", "battleSquaddieId2"],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneBattleSquaddieId({
                    eventTrigger,
                    battleSquaddieIds: ["battleSquaddieId3"],
                })
            ).toBe(false)
        })
    })

    describe("hasAtLeastOneSquaddieTemplateId", () => {
        it("passes if it has no squaddieTemplateIds to filter", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: [],
                squaddieTemplateIds: [],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneSquaddieTemplateId(
                    {
                        eventTrigger,
                        squaddieTemplateIds: ["squaddieTemplateId"],
                    }
                )
            ).toBe(true)
        })
        it("passes if it the filter contains at least 1 squaddieTemplateId", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: [],
                squaddieTemplateIds: [
                    "squaddieTemplateId",
                    "squaddieTemplateId2",
                ],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneSquaddieTemplateId(
                    {
                        eventTrigger,
                        squaddieTemplateIds: [
                            "squaddieTemplateId",
                            "squaddieTemplateId3",
                        ],
                    }
                )
            ).toBe(true)
        })
        it("fails if it the filter does not contain any matching squaddieTemplateId", () => {
            const eventTrigger: EventTriggerSquaddieQuery = {
                battleSquaddieIds: [],
                squaddieTemplateIds: [
                    "squaddieTemplateId",
                    "squaddieTemplateId2",
                ],
            }

            expect(
                EventTriggerSquaddieQueryService.hasAtLeastOneSquaddieTemplateId(
                    {
                        eventTrigger,
                        squaddieTemplateIds: ["squaddieTemplateId3"],
                    }
                )
            ).toBe(false)
        })
    })
})
