type ResultOrErrorError<T> = {
    error: T
    result?: never
}

type ResultOrErrorResult<U> = {
    error?: never
    result: U
}

export type ResultOrError<T, U> = NonNullable<
    ResultOrErrorResult<T> | ResultOrErrorError<U>
>

export type UnwrapResultOrError = <T, U>(
    e: ResultOrError<T, U>
) => NonNullable<T | U>

export const unwrapResultOrError: UnwrapResultOrError = <T, U>({
    error,
    result,
}: ResultOrError<T, U>) => {
    if (result !== undefined && error !== undefined) {
        throw new Error(
            `Received both left and right values at runtime when opening an Either\nLeft: ${JSON.stringify(
                error
            )}\nRight: ${JSON.stringify(result)}`
        )
    }
    if (error !== undefined) {
        return error as NonNullable<T>
    }
    if (result !== undefined) {
        return result as NonNullable<U>
    }
    throw new Error(
        `Received no result or error values at runtime when opening ResultOrError`
    )
}

export const isError = <T, U>(
    e: ResultOrError<T, U>
): e is ResultOrErrorError<U> => {
    return e.error !== undefined
}

export const isResult = <T, U>(
    e: ResultOrError<T, U>
): e is ResultOrErrorResult<T> => {
    return e.result !== undefined
}

export const makeError = <T>(value: T): ResultOrErrorError<T> => ({
    error: value,
})

export const makeResult = <U>(value: U): ResultOrErrorResult<U> => ({
    result: value,
})

export const getResultOrThrowError: <T, U>({
    result,
    error,
}: ResultOrError<T, U>) => NonNullable<T> = <T, U>({
    error,
    result,
}: ResultOrError<T, U>) => {
    if (error !== undefined) {
        throw error
    }
    if (result !== undefined) {
        return result as NonNullable<T>
    }
    throw new Error(
        `Received no result or error values at runtime when opening ResultOrError`
    )
}
