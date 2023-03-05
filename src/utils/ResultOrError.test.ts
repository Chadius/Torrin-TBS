import {isError, isResult, makeError, makeResult, ResultOrError, unwrapResultOrError} from "./ResultOrError";

describe('ResultOrError', () => {
   it('Returns a Result', () => {
      const returnResult = (): ResultOrError<string, Error> => {
         return makeResult("Hi this is a successful result");
      }

      const resultOrError: ResultOrError<string, Error> = returnResult();

      expect(isError(resultOrError)).toBeFalsy();
      expect(isResult(resultOrError)).toBeTruthy();

      const result = unwrapResultOrError(resultOrError);
      expect(result).toBe("Hi this is a successful result");
   });

   it('Returns a Error', () => {
      const returnError = (): ResultOrError<string, Error> => {
         return makeError(new Error("Hi this is an error"));
      }

      const resultOrError: ResultOrError<string, Error> = returnError();

      expect(isError(resultOrError)).toBeTruthy();
      expect(isResult(resultOrError)).toBeFalsy();

      const error = unwrapResultOrError(resultOrError);
      expect(error).toEqual(expect.any(Error));
      expect((error as Error).message.includes("Hi this is an error")).toBeTruthy();
   });
});