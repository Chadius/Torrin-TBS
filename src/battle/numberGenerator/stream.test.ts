import { NumberGeneratorStrategy } from "./strategy"
import { StreamNumberGenerator } from "./stream"
import { describe, expect, it } from "vitest"

describe("stream number generator", () => {
    it("will always produce the given numbers", () => {
        const generator: NumberGeneratorStrategy = new StreamNumberGenerator({
            results: [1, 2, 3, 4, 5, 6],
        })

        expect(generator.next()).toBe(1)
        expect(generator.next()).toBe(2)
        expect(generator.next()).toBe(3)
        expect(generator.next()).toBe(4)
        expect(generator.next()).toBe(5)
        expect(generator.next()).toBe(6)

        expect(generator.next()).toBe(6)
        expect(generator.next()).toBe(6)
        expect(generator.next()).toBe(6)
    })

    it("will throw an error if it is created with an out of range number", () => {
        const shouldThrowErrorTooHigh = () => {
            const generator: NumberGeneratorStrategy =
                new StreamNumberGenerator({
                    results: [1, 2, 3, 4, 5, 6, 9001],
                })
        }

        expect(() => {
            shouldThrowErrorTooHigh()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorTooHigh()
        }).toThrow(
            "Stream Number Generator must set numbers between 1 and 360, got: 9001"
        )

        const shouldThrowErrorTooLow = () => {
            const generator: NumberGeneratorStrategy =
                new StreamNumberGenerator({
                    results: [0, 1, 2, 3, 4, 5, 6],
                })
        }

        expect(() => {
            shouldThrowErrorTooLow()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorTooLow()
        }).toThrow(
            "Stream Number Generator must set numbers between 1 and 360, got: 0"
        )

        const shouldThrowErrorNotANumber = () => {
            const generator: NumberGeneratorStrategy =
                new StreamNumberGenerator({
                    results: [1, 2, 3, undefined, 4, 5, null, 6],
                })
        }
        expect(() => {
            shouldThrowErrorNotANumber()
        }).toThrow(Error)
        expect(() => {
            shouldThrowErrorNotANumber()
        }).toThrow(
            "Stream Number Generator must set numbers between 1 and 360, got: undefined"
        )
    })

    it("can clone an existing generator with its own stream values", () => {
        const originalGenerator: NumberGeneratorStrategy =
            new StreamNumberGenerator({
                results: [1, 2, 3, 4, 5, 6],
            })

        const newGenerator: NumberGeneratorStrategy = originalGenerator.clone()
        expect((newGenerator as StreamNumberGenerator).results).toEqual(
            (originalGenerator as StreamNumberGenerator).results
        )

        expect(originalGenerator.next()).toBe(1)
        expect(originalGenerator.next()).toBe(2)
        expect(originalGenerator.next()).toBe(3)

        expect(newGenerator.next()).toBe(1)
    })
})
