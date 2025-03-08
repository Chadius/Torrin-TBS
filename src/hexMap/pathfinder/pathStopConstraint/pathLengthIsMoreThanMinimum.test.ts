import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { PathLengthIsMoreThanMinimum } from "./pathLengthIsMoreThanMinimum"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

const createSearchConnectionFixture = () => {
    const condition = new PathLengthIsMoreThanMinimum()

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
    ]
    return { condition, pathAtHead }
}

describe("PathCanStopConditionMinimumDistance", () => {
    describe("deprecatedSearchPath", () => {
        it("knows when a path is less than the minimum distance", () => {
            const condition = new PathLengthIsMoreThanMinimum()

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

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    minimumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.squaddieCanStopAtTheEndOfThisPath({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(false)
        })

        it("knows when a path is more than the minimum distance", () => {
            const condition = new PathLengthIsMoreThanMinimum()

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

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    minimumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.squaddieCanStopAtTheEndOfThisPath({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("always returns true if no minimum distance is given", () => {
            const condition = new PathLengthIsMoreThanMinimum()

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

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            expect(
                condition.squaddieCanStopAtTheEndOfThisPath({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("returns undefined if there is no path", () => {
            const condition = new PathLengthIsMoreThanMinimum()
            const pathAtHead = SearchPathService.newSearchPath()

            const searchParameters = SearchParametersService.new({
                pathSizeConstraints: {
                    minimumDistanceMoved: 3,
                },
                goal: {},
            })

            expect(
                condition.squaddieCanStopAtTheEndOfThisPath({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBeUndefined()
        })
    })

    it("knows when a path is less than the minimum distance", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                minimumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("knows when a path is more than the minimum distance", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()
        pathAtHead.push({
            fromNode: pathAtHead[pathAtHead.length - 1].toNode,
            toNode: { q: 1, r: 2 },
            cost: 0,
        })

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                minimumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("always returns true if no minimum distance is given", () => {
        const { condition, pathAtHead } = createSearchConnectionFixture()
        pathAtHead.push({
            fromNode: pathAtHead[pathAtHead.length - 1].toNode,
            toNode: { q: 1, r: 2 },
            cost: 0,
        })
        pathAtHead.push({
            fromNode: pathAtHead[pathAtHead.length - 1].toNode,
            toNode: { q: 1, r: 3 },
            cost: 0,
        })

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns undefined if there is no path", () => {
        const condition = new PathLengthIsMoreThanMinimum()
        const pathAtHead: SearchConnection<HexCoordinate>[] = []

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                minimumDistanceMoved: 3,
            },
            goal: {},
        })

        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
