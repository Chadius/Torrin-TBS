import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "./squaddieAffiliation"
import { describe, expect, it } from "vitest"

describe("squaddieAffiliation", () => {
    const affiliationFriendlinessTests = [
        {
            actingAffiliation: SquaddieAffiliation.PLAYER,
            targetAffiliation: SquaddieAffiliation.PLAYER,
            expectedResult: true,
        },
        {
            actingAffiliation: SquaddieAffiliation.PLAYER,
            targetAffiliation: SquaddieAffiliation.ENEMY,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.PLAYER,
            targetAffiliation: SquaddieAffiliation.ALLY,
            expectedResult: true,
        },
        {
            actingAffiliation: SquaddieAffiliation.PLAYER,
            targetAffiliation: SquaddieAffiliation.NONE,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.ENEMY,
            targetAffiliation: SquaddieAffiliation.PLAYER,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.ENEMY,
            targetAffiliation: SquaddieAffiliation.ENEMY,
            expectedResult: true,
        },
        {
            actingAffiliation: SquaddieAffiliation.ENEMY,
            targetAffiliation: SquaddieAffiliation.ALLY,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.ENEMY,
            targetAffiliation: SquaddieAffiliation.NONE,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.ALLY,
            targetAffiliation: SquaddieAffiliation.PLAYER,
            expectedResult: true,
        },
        {
            actingAffiliation: SquaddieAffiliation.ALLY,
            targetAffiliation: SquaddieAffiliation.ENEMY,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.ALLY,
            targetAffiliation: SquaddieAffiliation.ALLY,
            expectedResult: true,
        },
        {
            actingAffiliation: SquaddieAffiliation.ALLY,
            targetAffiliation: SquaddieAffiliation.NONE,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.NONE,
            targetAffiliation: SquaddieAffiliation.PLAYER,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.NONE,
            targetAffiliation: SquaddieAffiliation.ENEMY,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.NONE,
            targetAffiliation: SquaddieAffiliation.ALLY,
            expectedResult: false,
        },
        {
            actingAffiliation: SquaddieAffiliation.NONE,
            targetAffiliation: SquaddieAffiliation.NONE,
            expectedResult: false,
        },
    ]

    it.each(affiliationFriendlinessTests)(
        `$actingAffiliation $targetAffiliation $intentIsFriendly`,
        ({ actingAffiliation, targetAffiliation, expectedResult }) => {
            expect(
                SquaddieAffiliationService.areSquaddieAffiliationsAllies({
                    actingAffiliation,
                    targetAffiliation,
                })
            ).toEqual(expectedResult)
        }
    )
})
