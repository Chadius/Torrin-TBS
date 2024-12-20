import { SearchResultsService } from "./searchResult"
import { SearchPathService } from "../searchPath"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { describe, expect, it } from "vitest"

describe("Search Results", () => {
    it("Can organize locations by the number of move actions", () => {
        const results = SearchResultsService.new({
            shortestPathByLocation: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
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
                        locationsTraveled: [
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
                        locationsTraveled: [
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

        const locationsByNumberOfMoveActions =
            SearchResultsService.getLocationsByNumberOfMoveActions(results)

        expect(locationsByNumberOfMoveActions).toEqual({
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
            shortestPathByLocation: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
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
                        locationsTraveled: [
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
                        locationsTraveled: [
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
                        locationsTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
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
                        locationsTraveled: [
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
            SearchResultsService.getClosestRoutesToLocationByDistance(
                results,
                {
                    q: 0,
                    r: 2,
                },
                0
            )
        expect(radius0).toHaveLength(1)
        expect(radius0).toEqual(expect.arrayContaining([{ q: 0, r: 2 }]))

        const locationWithNoRoute: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToLocationByDistance(
                results,
                {
                    q: 1,
                    r: 1,
                },
                0
            )
        expect(locationWithNoRoute).toHaveLength(0)

        const radius1: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToLocationByDistance(
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
            SearchResultsService.getClosestRoutesToLocationByDistance(
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

    it("can report all stoppable locations", () => {
        const results = SearchResultsService.new({
            shortestPathByLocation: {
                0: {
                    0: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
                            {
                                hexCoordinate: { q: 0, r: 0 },
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathService.newSearchPath(),
                        locationsTraveled: [
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
                        locationsTraveled: [
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

        const stoppableLocations =
            SearchResultsService.getStoppableLocations(results)

        expect(stoppableLocations).toHaveLength(3)
        expect(stoppableLocations).toContainEqual({ q: 0, r: 0 })
        expect(stoppableLocations).toContainEqual({ q: 0, r: 1 })
        expect(stoppableLocations).toContainEqual({ q: 0, r: 3 })
    })
})
