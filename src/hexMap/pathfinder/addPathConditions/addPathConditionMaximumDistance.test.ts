import { SearchParametersService } from "../searchParams"
import { SearchPathService } from "../searchPath"
import { AddPathConditionMaximumDistance } from "./addPathConditionMaximumDistance"

const createSearchPathFixture = () => {
    const condition = new AddPathConditionMaximumDistance()

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

describe("addPathConditionMaximumDistance", () => {
    it("knows when a path is less than the maximum distance", () => {
        const { condition, pathAtHead } = createSearchPathFixture()

        const searchParameters = SearchParametersService.new({
            maximumDistanceMoved: 3,
        })

        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("knows when a path is more than the maximum distance", () => {
        const { condition, pathAtHead } = createSearchPathFixture()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 3 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersService.new({
            maximumDistanceMoved: 3,
        })

        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("always returns true if no maximum distance is given", () => {
        const { condition, pathAtHead } = createSearchPathFixture()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 3 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersService.new({})

        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns undefined if there is no path", () => {
        const condition = new AddPathConditionMaximumDistance()
        const pathAtHead = SearchPathService.newSearchPath()

        const searchParameters = SearchParametersService.new({
            maximumDistanceMoved: 3,
        })

        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
