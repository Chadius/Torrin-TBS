import {NUMBER_GENERATOR_MAXIMUM, NUMBER_GENERATOR_MINIMUM, NumberGeneratorStrategy} from "./strategy";

export class RandomNumberGenerator implements NumberGeneratorStrategy {
    next(): number {
        const rngRange = NUMBER_GENERATOR_MAXIMUM - NUMBER_GENERATOR_MINIMUM;
        return Math.floor(Math.random() * rngRange) + NUMBER_GENERATOR_MINIMUM;
    }

    clone(): NumberGeneratorStrategy {
        return new RandomNumberGenerator();
    }
}
