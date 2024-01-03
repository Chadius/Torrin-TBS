import {DegreeOfSuccess, DegreeOfSuccessService} from "./degreeOfSuccess";

describe('degree of success', () => {
    it('at least successful', () => {
        expect(DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.CRITICAL_SUCCESS)).toBeTruthy();
        expect(DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.SUCCESS)).toBeTruthy();
        expect(DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.FAILURE)).toBeFalsy();
        expect(DegreeOfSuccessService.atLeastSuccessful(DegreeOfSuccess.CRITICAL_FAILURE)).toBeFalsy();
    });
    it('at best failure', () => {
        expect(DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.CRITICAL_SUCCESS)).toBeFalsy();
        expect(DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.SUCCESS)).toBeFalsy();
        expect(DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.FAILURE)).toBeTruthy();
        expect(DegreeOfSuccessService.atBestFailure(DegreeOfSuccess.CRITICAL_FAILURE)).toBeTruthy();
    });
});
