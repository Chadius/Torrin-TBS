import {assertsInteger, assertsNonNegativeNumber} from "./mathAssert";

describe('Math Asserts', () => {
    it('throws an error if non integer asserts to be an integer', () => {
        const shouldThrowError = () => {
            assertsInteger(5.5);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 5.5");
    });

    it('throws an error if negative number asserts non negative', () => {
        const shouldThrowError = () => {
            assertsNonNegativeNumber(-5.5);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be a non negative number: -5.5");
    });
});