import { describe, expect, it } from "vitest"
import {
    EventTriggerTurnRange,
    EventTriggerTurnRangeService,
} from "./eventTriggerTurnRange"

describe("EventTriggerTurnRange", () => {
    describe("isValidTrigger", () => {
        it("is invalid if all terms are undefined", () => {
            const incompleteEvent: EventTriggerTurnRange = {}
            expect(
                EventTriggerTurnRangeService.isValidTrigger(incompleteEvent)
            ).toBeFalsy()
        })
        it("is valid if any term is defined", () => {
            expect(
                EventTriggerTurnRangeService.isValidTrigger({
                    exactTurn: 0,
                })
            ).toBeTruthy()
            expect(
                EventTriggerTurnRangeService.isValidTrigger({
                    minimumTurns: 0,
                })
            ).toBeTruthy()
            expect(
                EventTriggerTurnRangeService.isValidTrigger({
                    maximumTurns: 0,
                })
            ).toBeTruthy()
        })
    })
    describe("isAfterMinimumTurnsPassed", () => {
        it("is if the trigger does not have minimum turns", () => {
            expect(
                EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                    trigger: {},
                    turnCount: 4,
                })
            ).toBe(true)
        })
        it("is not if the current turn is before the minimum", () => {
            expect(
                EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                    trigger: {
                        minimumTurns: 3,
                    },
                    turnCount: 2,
                })
            ).toBe(false)
        })
        it("is if the current turn is on or after the minimum", () => {
            expect(
                EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                    trigger: {
                        minimumTurns: 3,
                    },
                    turnCount: 3,
                })
            ).toBe(true)
            expect(
                EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                    trigger: {
                        minimumTurns: 3,
                    },
                    turnCount: 4,
                })
            ).toBe(true)
        })
    })
    describe("isBeforeMaximumTurnsPassed", () => {
        it("is if the trigger does not have maximum turns", () => {
            expect(
                EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                    trigger: {},
                    turnCount: 4,
                })
            ).toBe(true)
        })
        it("is not if the current turn is after the maximum", () => {
            expect(
                EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                    trigger: {
                        maximumTurns: 3,
                    },
                    turnCount: 4,
                })
            ).toBe(false)
        })
        it("is if the current turn is on or before the maximum", () => {
            expect(
                EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                    trigger: {
                        maximumTurns: 3,
                    },
                    turnCount: 2,
                })
            ).toBe(true)
            expect(
                EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                    trigger: {
                        maximumTurns: 3,
                    },
                    turnCount: 3,
                })
            ).toBe(true)
        })
    })
    describe("isOnExactTurn", () => {
        it("is if the trigger does not have exact turn", () => {
            expect(
                EventTriggerTurnRangeService.isOnExactTurn({
                    trigger: {},
                    turnCount: 4,
                })
            ).toBe(true)
        })
        it("is not if the current turn is not the exact turn", () => {
            expect(
                EventTriggerTurnRangeService.isOnExactTurn({
                    trigger: {
                        exactTurn: 2,
                    },
                    turnCount: 4,
                })
            ).toBe(false)
        })
        it("is if the current turn is the exact turn", () => {
            expect(
                EventTriggerTurnRangeService.isOnExactTurn({
                    trigger: {
                        exactTurn: 2,
                    },
                    turnCount: 2,
                })
            ).toBe(true)
        })
        it("is not if the current turn is 0 and we are ignoring turn 0 triggers", () => {
            expect(
                EventTriggerTurnRangeService.isOnExactTurn({
                    trigger: {
                        exactTurn: 0,
                    },
                    turnCount: 0,
                    ignoreTurn0: true,
                })
            ).toBe(false)
        })
    })
})
