import {NUMBER_GENERATOR_MAXIMUM, NUMBER_GENERATOR_MINIMUM, NumberGeneratorStrategy} from "./strategy";
import {RandomNumberGenerator} from "./random";

describe('random number generator', () => {
    it('will produce numbers in range (non deterministic)', () => {
        const generator: NumberGeneratorStrategy = new RandomNumberGenerator();
        for (let i = 0; i < 1000; i++) {
            const nextNumber = generator.next();
            expect(nextNumber).toBeGreaterThanOrEqual(NUMBER_GENERATOR_MINIMUM);
            expect(nextNumber).toBeLessThanOrEqual(NUMBER_GENERATOR_MAXIMUM);
        }
    });
});
