import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { SearchResult, SearchResultsService } from "./searchResult"
import { SearchResultAdapterService } from "./searchResultAdapter"
import { HexCoordinateService } from "../../hexCoordinate/hexCoordinate"

describe("search path adapter", () => {
    let searchResultsSpies: { [p: string]: MockInstance }
    let searchResult: SearchResult

    beforeEach(() => {
        searchResultsSpies = {
            getShortestPathToCoordinate: vi.spyOn(
                SearchResultsService,
                "getShortestPathToCoordinate"
            ),
            getClosestRoutesToCoordinateByDistance: vi.spyOn(
                SearchResultsService,
                "getClosestRoutesToCoordinateByDistance"
            ),
            getStoppableCoordinates: vi.spyOn(
                SearchResultsService,
                "getStoppableCoordinates"
            ),
        }

        searchResult = SearchResultsService.new({
            id: "searchResultAdapter tests",
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
            },
            stopCoordinatesReached: [{ q: 0, r: 0 }],
        })
    })

    afterEach(() => {
        Object.values(searchResultsSpies).forEach((spy) => spy.mockRestore())
    })

    it("getShortestPathToCoordinate", () => {
        SearchResultAdapterService.getShortestPathToCoordinate({
            searchResults: searchResult,
            mapCoordinate: { q: 0, r: 0 },
        })
        expect(searchResultsSpies["getShortestPathToCoordinate"]).toBeCalled()
    })
    it("getCoordinatesByNumberOfMoveActions", () => {
        expect(
            SearchResultAdapterService.getCoordinatesByNumberOfMoveActions({
                searchResults: searchResult,
                movementPerAction: 3,
            })
        ).toEqual({
            0: [{ q: 0, r: 0 }],
            1: [
                { q: 0, r: 1 },
                { q: 0, r: 2 },
            ],
            2: [{ q: 0, r: 3 }],
        })
    })
    it("getClosestRoutesToCoordinateByDistance", () => {
        SearchResultAdapterService.getClosestRoutesToCoordinateByDistance({
            searchResult: searchResult,
            coordinate: { q: 0, r: 0 },
            distanceFromCoordinate: 0,
        })
        expect(
            searchResultsSpies["getClosestRoutesToCoordinateByDistance"]
        ).toBeCalled()
    })
    it("getStoppableCoordinates", () => {
        SearchResultAdapterService.getCoordinatesWithPaths(searchResult)
        expect(searchResultsSpies["getStoppableCoordinates"]).toBeCalled()
    })
})
