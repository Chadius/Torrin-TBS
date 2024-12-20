import { RollModifierType, RollResultService } from "./rollResult"
import { describe, expect, it } from "vitest"

describe("Roll Result", () => {
    it("knows when the dice roll is the maximum", () => {
        expect(
            RollResultService.isMaximumRoll(
                RollResultService.new({
                    rolls: [1, 3],
                    occurred: true,
                })
            )
        ).toBeFalsy()
        expect(
            RollResultService.isMaximumRoll(
                RollResultService.new({
                    rolls: [6, 6],
                    occurred: true,
                })
            )
        ).toBeTruthy()
        expect(
            RollResultService.isMaximumRoll(
                RollResultService.new({
                    rolls: [6, 6],
                    occurred: true,
                    rollModifiers: {
                        [RollModifierType.MULTIPLE_ATTACK_PENALTY]: -3,
                    },
                })
            )
        ).toBeTruthy()
    })

    it("knows when the dice roll is the minimum", () => {
        expect(
            RollResultService.isMinimumRoll(
                RollResultService.new({
                    rolls: [1, 3],
                    occurred: true,
                })
            )
        ).toBeFalsy()
        expect(
            RollResultService.isMinimumRoll(
                RollResultService.new({
                    rolls: [1, 1],
                    occurred: true,
                })
            )
        ).toBeTruthy()
        expect(
            RollResultService.isMinimumRoll(
                RollResultService.new({
                    rolls: [1, 1],
                    occurred: true,
                    rollModifiers: {
                        [RollModifierType.TIER]: 3,
                    },
                })
            )
        ).toBeTruthy()
    })

    it("adds rolls and roll results to the total", () => {
        expect(
            RollResultService.totalAttackRoll(
                RollResultService.new({
                    rolls: [1, 3],
                    occurred: true,
                    rollModifiers: {
                        [RollModifierType.MULTIPLE_ATTACK_PENALTY]: -2,
                        [RollModifierType.TIER]: 4,
                    },
                })
            )
        ).toEqual(6)
    })

    describe("sanitize", () => {
        it("sets occurred to true if rolls are provided", () => {
            const sanitized = RollResultService.sanitize(
                RollResultService.new({
                    rolls: [3, 5],
                })
            )
            expect(sanitized.occurred).toBeTruthy()
        })
        it("sets occurred to false if rolls are not", () => {
            const sanitized = RollResultService.sanitize(
                RollResultService.new({})
            )
            expect(sanitized.occurred).toBeFalsy()
            expect(sanitized.rolls).toEqual([])
        })
    })
})
