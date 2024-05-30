import { NumberGeneratorStrategy } from "./strategy"
import { FixedNumberGenerator } from "./fixed"

describe("fixed number generator", () => {
    it("will always produce the given number", () => {
        const generatorAlwaysReturns5: NumberGeneratorStrategy =
            new FixedNumberGenerator({ result: 5 })
        expect(generatorAlwaysReturns5.next()).toBe(5)

        const generatorAlwaysReturns255: NumberGeneratorStrategy =
            new FixedNumberGenerator({ result: 255 })
        expect(generatorAlwaysReturns255.next()).toBe(255)
    })

    it("will throw an error if it is created with an out of range number", () => {
        const shouldThrowErrorTooHigh = () => {
            new FixedNumberGenerator({ result: 9001 })
        }

        expect(() => {
            shouldThrowErrorTooHigh()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorTooHigh()
        }).toThrow(
            "Fixed Number Generator must set number between 1 and 360, got: 9001"
        )

        const shouldThrowErrorTooLow = () => {
            new FixedNumberGenerator({ result: 0 })
        }

        expect(() => {
            shouldThrowErrorTooLow()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorTooLow()
        }).toThrow(
            "Fixed Number Generator must set number between 1 and 360, got: 0"
        )

        const shouldThrowErrorNotANumber = () => {
            new FixedNumberGenerator({ result: undefined })
        }
        expect(() => {
            shouldThrowErrorNotANumber()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorNotANumber()
        }).toThrow(
            "Fixed Number Generator must set number between 1 and 360, got: undefined"
        )
    })

    it("can clone an existing generator with its own stream values", () => {
        const originalGenerator: NumberGeneratorStrategy =
            new FixedNumberGenerator({ result: 5 })

        const newGenerator: NumberGeneratorStrategy = originalGenerator.clone()
        expect((newGenerator as FixedNumberGenerator).result).toEqual(
            (originalGenerator as FixedNumberGenerator).result
        )

        expect(originalGenerator.next()).toBe(5)
        expect(newGenerator.next()).toBe(5)
    })
})
