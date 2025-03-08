import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { NewPathLengthIsLessThanMaximum } from "./newPathLengthIsLessThanMaximum"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

const createDeprecatedSearchPathFixture = () => {
    const condition = new NewPathLengthIsLessThanMaximum()

    const pathAtHead = SearchPathService.newSearchPath()
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
        0
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
        0
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
        0
    )
    SearchPathService.add(
        pathAtHead,
        { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 0 },
        0
    )
    return { condition, pathAtHead }
}

const createSearchConnectionFixture = () => {
    const condition = new NewPathLengthIsLessThanMaximum()

    const pathAtHead: SearchConnection<HexCoordinate>[] = [
        {
            fromNode: { q: 0, r: 0 },
            toNode: { q: 1, r: 0 },
            cost: 0,
        },
        {
            fromNode: { q: 1, r: 0 },
            toNode: { q: 1, r: 1 },
            cost: 0,
        },
        {
            fromNode: { q: 1, r: 1 },
            toNode: { q: 1, r: 2 },
            cost: 0,
        },
    ]
    return { condition, pathAtHead }
}

describe("addPathConditionMaximumDistance", () => {
    describe("deprecatedSearchPath", () => {
        it("knows when a path is less than the maximum distance", () => {
            const { condition, pathAtHead } =
                createDeprecatedSearchPathFixture()

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    maximumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("knows when a path is more than the maximum distance", () => {
            const { condition, pathAtHead } =
                createDeprecatedSearchPathFixture()
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 1, r: 3 }, cumulativeMovementCost: 0 },
                0
            )

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    maximumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(false)
        })

        it("always returns true if no maximum distance is given", () => {
            const { condition, pathAtHead } =
                createDeprecatedSearchPathFixture()
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 1, r: 3 }, cumulativeMovementCost: 0 },
                0
            )

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("returns undefined if there is no path", () => {
            const condition = new NewPathLengthIsLessThanMaximum()
            const pathAtHead = SearchPathService.newSearchPath()

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    maximumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBeUndefined()
        })
    })

    it("knows when a path is less than the maximum distance", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                maximumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("knows when a path is more than the maximum distance", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()
        pathAtHead.push({
            fromNode: pathAtHead[pathAtHead.length - 1].toNode,
            toNode: { q: 1, r: 3 },
            cost: 0,
        })

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                maximumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("always returns true if no maximum distance is given", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()
        pathAtHead.push({
            fromNode: pathAtHead[pathAtHead.length - 1].toNode,
            toNode: { q: 1, r: 3 },
            cost: 0,
        })

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns undefined if there is no path", () => {
        const condition = new NewPathLengthIsLessThanMaximum()
        const pathAtHead: SearchConnection<HexCoordinate>[] = []

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                maximumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
