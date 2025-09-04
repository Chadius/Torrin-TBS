import {
    RollModifierEnum,
    RollModifierTypeService,
    RollResultService,
} from "./rollResult"
import { describe, expect, it } from "vitest"
import { DegreeOfSuccess } from "./degreeOfSuccess"

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
                        [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -3,
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
                        [RollModifierEnum.PROFICIENCY]: 3,
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
                        [RollModifierEnum.PROFICIENCY]: 4,
                        [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -2,
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

    describe("creates readable names for modifiers", () => {
        const tests = [
            {
                type: RollModifierEnum.MULTIPLE_ATTACK_PENALTY,
                abbreviate: false,
                expected: "Multiple attack penalty",
            },
            {
                type: RollModifierEnum.MULTIPLE_ATTACK_PENALTY,
                abbreviate: true,
                expected: "MAP",
            },
            {
                type: RollModifierEnum.PROFICIENCY,
                abbreviate: false,
                expected: "Proficiency",
            },
            {
                type: RollModifierEnum.PROFICIENCY,
                abbreviate: true,
                expected: "Prof",
            },
        ]

        it.each(tests)(`$expected`, ({ type, abbreviate, expected }) => {
            expect(
                RollModifierTypeService.readableName({ type, abbreviate })
            ).toEqual(expected)
        })
    })

    describe("calculate chance of degrees of success", () => {
        it("returns possible degrees of success", () => {
            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(-7)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.CRITICAL_FAILURE,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.CRITICAL_SUCCESS,
                ])
            )

            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(-3)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.CRITICAL_FAILURE,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.CRITICAL_SUCCESS,
                ])
            )

            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(-2)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.CRITICAL_SUCCESS,
                ])
            )

            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(4)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.CRITICAL_SUCCESS,
                ])
            )

            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(-13)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.CRITICAL_FAILURE,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.SUCCESS,
                ])
            )

            expect(
                RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(-19)
            ).toEqual(
                expect.arrayContaining([
                    DegreeOfSuccess.CRITICAL_FAILURE,
                    DegreeOfSuccess.FAILURE,
                ])
            )
        })
    })
})
