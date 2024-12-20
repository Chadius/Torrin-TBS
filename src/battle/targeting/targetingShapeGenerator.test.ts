import { SnakeShapeGenerator } from "./snakeShapeGenerator"
import {
    TargetingShape,
    TargetingShapeGeneratorService,
} from "./targetingShapeGenerator"
import { describe, expect, it } from "vitest"

describe("Targeting Shape Generator", () => {
    it("generates a Snake Shape when requested", () => {
        const snake: SnakeShapeGenerator = TargetingShapeGeneratorService.new(
            TargetingShape.SNAKE
        )
        expect(snake).toBeInstanceOf(SnakeShapeGenerator)
    })

    it("throws an error when asked to generate an unknown Shape", () => {
        const shouldThrowError = () => {
            TargetingShapeGeneratorService.new(TargetingShape.UNKNOWN)
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrowError("Unexpected shape generator name: UNKNOWN")
    })
})
