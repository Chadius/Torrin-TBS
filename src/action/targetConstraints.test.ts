import { ActionRange, TargetConstraintsService } from "./targetConstraints"
import { describe, expect, it } from "vitest"
import { CoordinateGeneratorShape } from "../battle/targeting/coordinateGenerator"

describe("Target Constraints", () => {
    it("can make an action range with defaults", () => {
        // TODO remove range on this to ensure self is used by default
        const range = TargetConstraintsService.new({ range: ActionRange.SELF })
        expect(range.range).toEqual(ActionRange.SELF)
        expect(range.coordinateGeneratorShape).toEqual(
            CoordinateGeneratorShape.BLOOM
        )
    })

    describe("isInRange", () => {
        const trueTests = [
            {
                range: ActionRange.SELF,
                distance: 0,
            },
            {
                range: ActionRange.MELEE,
                distance: 1,
            },
            {
                range: ActionRange.REACH,
                distance: 2,
            },
            {
                range: ActionRange.SHORT,
                distance: 3,
            },
            {
                range: ActionRange.MEDIUM,
                distance: 4,
            },
            {
                range: ActionRange.LONG,
                distance: 6,
            },
        ]

        it.each(trueTests)(
            `$range $distance is in range`,
            ({ range, distance }) => {
                const constraints = TargetConstraintsService.new({
                    range,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                })

                expect(
                    TargetConstraintsService.isInRange({
                        constraints,
                        distance,
                    })
                ).toBeTruthy()
            }
        )

        const falseTests = [
            {
                range: ActionRange.SELF,
                distance: 1,
            },
            {
                range: ActionRange.MELEE,
                distance: 2,
            },
            {
                range: ActionRange.REACH,
                distance: 3,
            },
            {
                range: ActionRange.SHORT,
                distance: 4,
            },
            {
                range: ActionRange.MEDIUM,
                distance: 5,
            },
            {
                range: ActionRange.LONG,
                distance: 7,
            },
        ]

        it.each(falseTests)(
            `$range $distance not in range`,
            ({ range, distance }) => {
                const constraints = TargetConstraintsService.new({
                    range,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                })

                expect(
                    TargetConstraintsService.isInRange({
                        constraints,
                        distance,
                    })
                ).toBeFalsy()
            }
        )
    })
})
