import {
    getResultOrThrowError,
    isError,
    isResult,
    makeError,
    makeResult,
    ResultOrError,
    unwrapResultOrError
} from "./ResultOrError";

describe('ResultOrError', () => {
    const returnResult = (): ResultOrError<string, Error> => {
        return makeResult("Hi this is a successful result");
    }

    const returnError = (): ResultOrError<string, Error> => {
        return makeError(new Error("Hi this is an error"));
    }

    it('Returns a Result', () => {
        const resultOrError: ResultOrError<string, Error> = returnResult();

        expect(isError(resultOrError)).toBeFalsy();
        expect(isResult(resultOrError)).toBeTruthy();

        const result = unwrapResultOrError(resultOrError);
        expect(result).toBe("Hi this is a successful result");
    });

    it('Returns a Error', () => {
        const resultOrError: ResultOrError<string, Error> = returnError();

        expect(isError(resultOrError)).toBeTruthy();
        expect(isResult(resultOrError)).toBeFalsy();

        const error = unwrapResultOrError(resultOrError);
        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes("Hi this is an error")).toBeTruthy();
    });

    it('Can make one call to get a result or throw an error', () => {
        const result: string = getResultOrThrowError(returnResult());
        expect(result).toBe("Hi this is a successful result");

        const resultOrError: ResultOrError<string, Error> = returnError();
        expect(() => {
            getResultOrThrowError(resultOrError)
        }).toThrow(Error);
        expect(() => {
            getResultOrThrowError(resultOrError)
        }).toThrow("Hi this is an error");
    });
});