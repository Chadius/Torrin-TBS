import { SearchParametersHelper } from "../searchParams"
import { SearchPathService } from "../searchPath"
import { PathCanStopConditionMinimumDistance } from "./pathCanStopConditionMinimumDistance"

describe("PathCanStopConditionMinimumDistance", () => {
    it("knows when a path is less than the minimum distance", () => {
        const condition = new PathCanStopConditionMinimumDistance()

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

        const searchParameters = SearchParametersHelper.new({
            minimumDistanceMoved: 3,
        })

        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("knows when a path is more than the minimum distance", () => {
        const condition = new PathCanStopConditionMinimumDistance()

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

        const searchParameters = SearchParametersHelper.new({
            minimumDistanceMoved: 3,
        })

        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("always returns true if no minimum distance is given", () => {
        const condition = new PathCanStopConditionMinimumDistance()

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
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 3 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersHelper.new({})

        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns undefined if there is no path", () => {
        const condition = new PathCanStopConditionMinimumDistance()
        const pathAtHead = SearchPathService.newSearchPath()

        const searchParameters = SearchParametersHelper.new({
            minimumDistanceMoved: 3,
        })

        expect(
            condition.shouldMarkPathLocationAsStoppable({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
