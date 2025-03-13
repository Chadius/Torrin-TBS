import { SearchResultsService } from "./searchResult"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexCoordinate/hexCoordinate"
import { describe, expect, it } from "vitest"

describe("Search Results", () => {
    it("get closest routes to destination", () => {
        const results = SearchResultsService.new({
            shortestPathByCoordinate: {
                [HexCoordinateService.toString({ q: 0, r: 0 })]: [],
                [HexCoordinateService.toString({ q: 0, r: 1 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 1 },
                        cost: 1,
                    },
                ],
                [HexCoordinateService.toString({ q: 0, r: 2 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 1 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 0, r: 1 },
                        toNode: { q: 0, r: 2 },
                        cost: 1,
                    },
                ],
                [HexCoordinateService.toString({ q: 0, r: 3 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 1 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 0, r: 1 },
                        toNode: { q: 0, r: 2 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 0, r: 2 },
                        toNode: { q: 0, r: 3 },
                        cost: 2,
                    },
                ],
                [HexCoordinateService.toString({ q: 1, r: 0 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 1, r: 0 },
                        cost: 1,
                    },
                ],
                [HexCoordinateService.toString({ q: 1, r: 2 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 1, r: 0 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 1, r: 0 },
                        toNode: { q: 1, r: 1 },
                        cost: 0,
                    },
                    {
                        fromNode: { q: 1, r: 1 },
                        toNode: { q: 1, r: 2 },
                        cost: 2,
                    },
                ],
                [HexCoordinateService.toString({ q: 1, r: 3 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 1, r: 0 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 1, r: 0 },
                        toNode: { q: 1, r: 1 },
                        cost: 0,
                    },
                    {
                        fromNode: { q: 1, r: 1 },
                        toNode: { q: 1, r: 2 },
                        cost: 2,
                    },
                    {
                        fromNode: { q: 1, r: 2 },
                        toNode: { q: 1, r: 3 },
                        cost: 1,
                    },
                ],
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
                [HexCoordinateService.toString({ q: 0, r: 0 })]: [],
                [HexCoordinateService.toString({ q: 0, r: 1 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 1 },
                        cost: 1,
                    },
                ],
                [HexCoordinateService.toString({ q: 0, r: 2 })]: undefined,
                [HexCoordinateService.toString({ q: 0, r: 3 })]: [
                    {
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 1 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 0, r: 1 },
                        toNode: { q: 0, r: 2 },
                        cost: 1,
                    },
                    {
                        fromNode: { q: 0, r: 2 },
                        toNode: { q: 0, r: 3 },
                        cost: 2,
                    },
                ],
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
