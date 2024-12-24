import { SearchResultsService } from "./searchResult"
import { SearchPathService } from "../searchPath"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { describe, expect, it } from "vitest"

describe("Search Results", () => {
    it("Can organize coordinates by the number of move actions", () => {
        const results = SearchResultsService.new({
            shortestPathByCoordinate: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    3: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                            {
                                hexCoordinate: { q: 0, r: 3 },
                                cumulativeMovementCost: 4,
                            },
                        ],
                        currentNumberOfMoveActions: 2,
                    },
                },
            },
        })

        const coordinatesByNumberOfMoveActions =
            SearchResultsService.getCoordinatesByNumberOfMoveActions(results)

        expect(coordinatesByNumberOfMoveActions).toEqual({
            1: [
                { q: 0, r: 0 },
                { q: 0, r: 1 },
                { q: 0, r: 2 },
            ],
            2: [{ q: 0, r: 3 }],
        })
    })

    it("get closest routes to destination", () => {
        const results = SearchResultsService.new({
            shortestPathByCoordinate: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    3: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                            {
                                hexCoordinate: { q: 0, r: 3 },
                                cumulativeMovementCost: 4,
                            },
                        ],
                        currentNumberOfMoveActions: 2,
                    },
                },
                1: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    3: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                            {
                                hexCoordinate: { q: 0, r: 3 },
                                cumulativeMovementCost: 4,
                            },
                        ],
                        currentNumberOfMoveActions: 2,
                    },
                },
            },
        })

        const radius0: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToCoordinateByDistance(
                results,
                {
                    q: 0,
                    r: 2,
                },
                0
            )
        expect(radius0).toHaveLength(1)
        expect(radius0).toEqual(expect.arrayContaining([{ q: 0, r: 2 }]))

        const coordinateWithNoRoute: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToCoordinateByDistance(
                results,
                {
                    q: 1,
                    r: 1,
                },
                0
            )
        expect(coordinateWithNoRoute).toHaveLength(0)

        const radius1: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToCoordinateByDistance(
                results,
                {
                    q: 0,
                    r: 2,
                },
                1
            )
        expect(radius1).toHaveLength(3)
        expect(radius1).toEqual(
            expect.arrayContaining([
                { q: 0, r: 1 },
                { q: 0, r: 3 },
                { q: 1, r: 2 },
            ])
        )

        const radius2: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToCoordinateByDistance(
                results,
                {
                    q: 0,
                    r: 2,
                },
                2
            )
        expect(radius2).toHaveLength(3)
        expect(radius2).toEqual(
            expect.arrayContaining([
                { q: 0, r: 0 },
                { q: 1, r: 0 },
                { q: 1, r: 3 },
            ])
        )
    })

    it("can report all stoppable coordinates", () => {
        const results = SearchResultsService.new({
            shortestPathByCoordinate: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: undefined,
                    3: {
                        ...SearchPathService.newSearchPath(),
                        coordinatesTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: { q: 0, r: 1 },
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: { q: 0, r: 2 },
                                cumulativeMovementCost: 2,
                            },
                            {
                                hexCoordinate: { q: 0, r: 3 },
                                cumulativeMovementCost: 4,
                            },
                        ],
                        currentNumberOfMoveActions: 2,
                    },
                },
            },
        })

        const stoppableCoordinates =
            SearchResultsService.getStoppableCoordinates(results)

        expect(stoppableCoordinates).toHaveLength(3)
        expect(stoppableCoordinates).toContainEqual({ q: 0, r: 0 })
        expect(stoppableCoordinates).toContainEqual({ q: 0, r: 1 })
        expect(stoppableCoordinates).toContainEqual({ q: 0, r: 3 })
    })
})
