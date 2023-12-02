export const NUMBER_GENERATOR_MINIMUM = 1
export const NUMBER_GENERATOR_MAXIMUM = 360

export interface NumberGeneratorStrategy {
    next(): number;

    clone(): NumberGeneratorStrategy;
}

export const isNumberInGeneratorRange = (result: number) => {
    return !(
        result === undefined
        || result === null
        || result < NUMBER_GENERATOR_MINIMUM
        || result > NUMBER_GENERATOR_MAXIMUM
    );
};
