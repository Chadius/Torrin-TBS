import {
    isNumberInGeneratorRange,
    NUMBER_GENERATOR_MAXIMUM,
    NUMBER_GENERATOR_MINIMUM,
    NumberGeneratorStrategy,
} from "./strategy"

export class StreamNumberGenerator implements NumberGeneratorStrategy {
    results: number[]

    constructor({ results }: { results: number[] }) {
        results.forEach((result) => {
            if (!isNumberInGeneratorRange(result)) {
                throw new Error(
                    `Stream Number Generator must set numbers between ${NUMBER_GENERATOR_MINIMUM} and ${NUMBER_GENERATOR_MAXIMUM}, got: ${result}`
                )
            }
        })

        this.results = [...results]
    }

    next(): number {
        if (this.results.length <= 1) {
            return this.results[0]
        }

        return this.results.shift()
    }

    clone(): NumberGeneratorStrategy {
        return new StreamNumberGenerator({ results: [...this.results] })
    }
}
