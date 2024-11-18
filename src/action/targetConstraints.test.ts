import { TargetConstraintsService } from "./targetConstraints"
import { TargetingShape } from "../battle/targeting/targetingShapeGenerator"

describe("Target Constraints", () => {
    it("can make an action range with defaults", () => {
        const range = TargetConstraintsService.new({})
        expect(range.minimumRange).toEqual(0)
        expect(range.maximumRange).toEqual(0)
        expect(range.targetingShape).toEqual(TargetingShape.SNAKE)
    })

    it("can make an action range with given values", () => {
        const range = TargetConstraintsService.new({
            minimumRange: 1,
            maximumRange: 2,
            targetingShape: TargetingShape.SNAKE,
        })
        expect(range.minimumRange).toEqual(1)
        expect(range.maximumRange).toEqual(2)
        expect(range.targetingShape).toEqual(TargetingShape.SNAKE)
    })

    it("ensures minimum is always less than maximum", () => {
        const range = TargetConstraintsService.new({
            minimumRange: 2,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        })
        expect(range.minimumRange).toEqual(1)
        expect(range.maximumRange).toEqual(2)
    })

    it("ensures minimum is always less than maximum, even if the maximum is not specified", () => {
        const range = TargetConstraintsService.new({ minimumRange: 1 })
        expect(range.minimumRange).toEqual(0)
        expect(range.maximumRange).toEqual(1)
        expect(range.targetingShape).toEqual(TargetingShape.SNAKE)
    })

    it("never allows negative values", () => {
        const range = TargetConstraintsService.new({
            minimumRange: -9001,
            maximumRange: -5,
            targetingShape: TargetingShape.SNAKE,
        })
        expect(range.minimumRange).toEqual(0)
        expect(range.maximumRange).toEqual(0)
    })
})
