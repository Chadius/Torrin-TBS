import {isValidValue} from "./validityCheck";

describe('validity test', () => {
    it('knows when a field is invalid', () => {
        expect(isValidValue("apple")).toBeTruthy();
        expect(isValidValue("")).toBeTruthy();
        expect(isValidValue(5)).toBeTruthy();
        expect(isValidValue([])).toBeTruthy();
        expect(isValidValue({})).toBeTruthy();
        expect(isValidValue(true)).toBeTruthy();

        expect(isValidValue(undefined)).toBeFalsy();
        expect(isValidValue(null)).toBeFalsy();
        expect(isValidValue(NaN)).toBeFalsy();
        expect(isValidValue(false)).toBeFalsy();
    });
});
