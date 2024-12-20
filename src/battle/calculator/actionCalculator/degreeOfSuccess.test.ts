import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess"
import { describe, expect, it } from "vitest"

describe("degree of success", () => {
    it("at least successful", () => {
        expect(
            DegreeOfSuccessService.atLeastSuccessful(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
        ).toBeTruthy()
        expect(
            DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.SUCCESS)
        ).toBeTruthy()
        expect(
            DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.FAILURE)
        ).toBeFalsy()
        expect(
            DegreeOfSuccessService.atLeastSuccessful(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
        ).toBeFalsy()
    })
    it("at best failure", () => {
        expect(
            DegreeOfSuccessService.atBestFailure(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
        ).toBeFalsy()
        expect(
            DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.SUCCESS)
        ).toBeFalsy()
        expect(
            DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.FAILURE)
        ).toBeTruthy()
        expect(
            DegreeOfSuccessService.atBestFailure(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
        ).toBeTruthy()
    })
    it("can upgrade the degree of success by one step at a time", () => {
        expect(
            DegreeOfSuccessService.upgradeByOneStep(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
        ).toBe(DegreeOfSuccess.FAILURE)
        expect(
            DegreeOfSuccessService.upgradeByOneStep(DegreeOfSuccess.FAILURE)
        ).toBe(DegreeOfSuccess.SUCCESS)
        expect(
            DegreeOfSuccessService.upgradeByOneStep(DegreeOfSuccess.SUCCESS)
        ).toBe(DegreeOfSuccess.CRITICAL_SUCCESS)
        expect(
            DegreeOfSuccessService.upgradeByOneStep(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
        ).toBe(DegreeOfSuccess.CRITICAL_SUCCESS)
    })
    it("can degrade the degree of success by one step at a time", () => {
        expect(
            DegreeOfSuccessService.degradeByOneStep(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
        ).toBe(DegreeOfSuccess.CRITICAL_FAILURE)
        expect(
            DegreeOfSuccessService.degradeByOneStep(DegreeOfSuccess.FAILURE)
        ).toBe(DegreeOfSuccess.CRITICAL_FAILURE)
        expect(
            DegreeOfSuccessService.degradeByOneStep(DegreeOfSuccess.SUCCESS)
        ).toBe(DegreeOfSuccess.FAILURE)
        expect(
            DegreeOfSuccessService.degradeByOneStep(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
        ).toBe(DegreeOfSuccess.SUCCESS)
    })
})
