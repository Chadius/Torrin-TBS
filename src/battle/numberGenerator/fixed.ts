import {
    isNumberInGeneratorRange,
    NUMBER_GENERATOR_MAXIMUM,
    NUMBER_GENERATOR_MINIMUM,
    NumberGeneratorStrategy
} from "./strategy";

export class FixedNumberGenerator implements NumberGeneratorStrategy {
    result: number;

    constructor({result}: { result: number }) {
        if (!isNumberInGeneratorRange(result)) {
            throw new Error(`Fixed Number Generator must set number between ${NUMBER_GENERATOR_MINIMUM} and ${NUMBER_GENERATOR_MAXIMUM}, got: ${result}`);
        }

        this.result = result;
    }

    next(): number {
        return this.result;
    }

    clone(): NumberGeneratorStrategy {
        return new FixedNumberGenerator({result: this.result});
    }
}
