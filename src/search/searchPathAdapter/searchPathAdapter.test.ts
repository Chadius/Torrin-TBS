import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    SearchPath,
    SearchPathService,
} from "../../hexMap/pathfinder/searchPath"
import { SearchPathAdapterService } from "./searchPathAdapter"
import { SearchConnection } from "../searchGraph/graph"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

describe("search path adapter", () => {
    describe("search path calls the older Search Path library", () => {
        let searchPathSpies: { [p: string]: MockInstance }
        let searchPath: SearchPath

        beforeEach(() => {
            searchPathSpies = {
                getTotalMovementCost: vi.spyOn(
                    SearchPathService,
                    "getTotalMovementCost"
                ),
                clone: vi.spyOn(SearchPathService, "clone"),
                newSearchPath: vi.spyOn(SearchPathService, "newSearchPath"),
                add: vi.spyOn(SearchPathService, "add"),
                getMostRecentCoordinate: vi.spyOn(
                    SearchPathService,
                    "getMostRecentCoordinate"
                ),
                getCoordinates: vi.spyOn(SearchPathService, "getCoordinates"),
                getTotalDistance: vi.spyOn(
                    SearchPathService,
                    "getTotalDistance"
                ),
                compare: vi.spyOn(SearchPathService, "compare"),
            }

            searchPath = SearchPathService.newSearchPath()

            SearchPathAdapterService.add(
                searchPath,
                {
                    hexCoordinate: { q: 0, r: 2 },
                    cumulativeMovementCost: 0,
                },
                1
            )
            SearchPathAdapterService.add(
                searchPath,
                {
                    hexCoordinate: { q: 0, r: 3 },
                    cumulativeMovementCost: 1,
                },
                2
            )
            SearchPathAdapterService.add(
                searchPath,
                {
                    hexCoordinate: { q: 0, r: 4 },
                    cumulativeMovementCost: 3,
                },
                1
            )
            SearchPathAdapterService.add(
                searchPath,
                {
                    hexCoordinate: { q: 1, r: 4 },
                    cumulativeMovementCost: 4,
                },
                0
            )
        })

        afterEach(() => {
            Object.values(searchPathSpies).forEach((spy) => spy.mockRestore())
        })

        it("getTotalMovementCost", () => {
            SearchPathAdapterService.getTotalMovementCost(searchPath)
            expect(searchPathSpies["getTotalMovementCost"]).toBeCalled()
        })
        it("clone", () => {
            SearchPathAdapterService.clone(searchPath)
            expect(searchPathSpies["clone"]).toBeCalled()
        })
        it("add", () => {
            SearchPathAdapterService.add(
                searchPath,
                {
                    hexCoordinate: { q: 0, r: 3 },
                    cumulativeMovementCost: 4,
                },
                1
            )
            expect(searchPathSpies["add"]).toBeCalled()
        })
        it("getMostRecentCoordinate", () => {
            SearchPathAdapterService.getMostRecentCoordinate(searchPath)
            expect(searchPathSpies["getMostRecentCoordinate"]).toBeCalled()
        })
        it("getCoordinates", () => {
            SearchPathAdapterService.getCoordinates(searchPath)
            expect(searchPathSpies["getCoordinates"]).toBeCalled()
        })
        it("getTotalDistance", () => {
            SearchPathAdapterService.getTotalDistance(searchPath)
            expect(searchPathSpies["getTotalDistance"]).toBeCalled()
        })
        it("compare", () => {
            const searchPathB = SearchPathService.newSearchPath()
            SearchPathAdapterService.compare(searchPath, searchPathB)
            expect(searchPathSpies["compare"]).toBeCalled()
        })

        it("can convert to a SearchConnection object", () => {
            const connectionArray: SearchConnection<HexCoordinate>[] =
                SearchPathAdapterService.convertToSearchConnectionArray(
                    searchPath
                )
            const expectedResult: SearchConnection<HexCoordinate>[] = [
                {
                    fromNode: { q: 0, r: 2 },
                    toNode: { q: 0, r: 3 },
                    cost: 1,
                },
                {
                    fromNode: { q: 0, r: 3 },
                    toNode: { q: 0, r: 4 },
                    cost: 2,
                },
                {
                    fromNode: { q: 0, r: 4 },
                    toNode: { q: 1, r: 4 },
                    cost: 1,
                },
            ]

            expect(connectionArray).toEqual(expectedResult)
        })
    })

    describe("search connection adapts to Search Path Service", () => {
        let connections: SearchConnection<HexCoordinate>[]

        beforeEach(() => {
            connections = [
                {
                    fromNode: { q: 0, r: 2 },
                    toNode: { q: 0, r: 3 },
                    cost: 1,
                },
                {
                    fromNode: { q: 0, r: 3 },
                    toNode: { q: 0, r: 4 },
                    cost: 2,
                },
                {
                    fromNode: { q: 0, r: 4 },
                    toNode: { q: 1, r: 4 },
                    cost: 1,
                },
            ]
        })

        it("getTotalMovementCost", () => {
            expect(
                SearchPathAdapterService.getTotalMovementCost(connections)
            ).toEqual(4)
        })
        it("clone", () => {
            const clone = SearchPathAdapterService.clone(connections)
            expect(clone).toEqual(connections)
        })
        it("add", () => {
            SearchPathAdapterService.add(
                connections,
                {
                    hexCoordinate: { q: 1, r: 5 },
                    cumulativeMovementCost: 0,
                },
                3
            )
            expect(connections[connections.length - 1]).toEqual({
                fromNode: { q: 1, r: 4 },
                toNode: { q: 1, r: 5 },
                cost: 3,
            })
        })
        it("getMostRecentCoordinate", () => {
            expect(
                SearchPathAdapterService.getMostRecentCoordinate(connections)
            ).toEqual({
                cumulativeMovementCost: 4,
                hexCoordinate: {
                    q: 1,
                    r: 4,
                },
            })
        })
        it("getCoordinates", () => {
            expect(
                SearchPathAdapterService.getCoordinates(connections)
            ).toEqual([
                {
                    hexCoordinate: { q: 0, r: 2 },
                    cumulativeMovementCost: 0,
                },
                {
                    hexCoordinate: { q: 0, r: 3 },
                    cumulativeMovementCost: 1,
                },
                {
                    hexCoordinate: { q: 0, r: 4 },
                    cumulativeMovementCost: 3,
                },
                {
                    hexCoordinate: { q: 1, r: 4 },
                    cumulativeMovementCost: 4,
                },
            ])
        })
        it("getTotalDistance", () => {
            expect(
                SearchPathAdapterService.getTotalDistance(connections)
            ).toEqual(3)
        })
        it("compare", () => {
            const connectionsB: SearchConnection<HexCoordinate>[] = []
            expect(
                SearchPathAdapterService.compare(connections, connectionsB)
            ).toBeGreaterThan(0)
        })

        it("can convert to a SearchPath object", () => {
            const searchPath: SearchPath =
                SearchPathAdapterService.convertToSearchPath(connections)
            const expectedResult: SearchPath = SearchPathService.newSearchPath()

            SearchPathAdapterService.add(
                expectedResult,
                {
                    hexCoordinate: { q: 0, r: 2 },
                    cumulativeMovementCost: 0,
                },
                1
            )
            SearchPathAdapterService.add(
                expectedResult,
                {
                    hexCoordinate: { q: 0, r: 3 },
                    cumulativeMovementCost: 1,
                },
                2
            )
            SearchPathAdapterService.add(
                expectedResult,
                {
                    hexCoordinate: { q: 0, r: 4 },
                    cumulativeMovementCost: 3,
                },
                1
            )
            SearchPathAdapterService.add(
                expectedResult,
                {
                    hexCoordinate: { q: 1, r: 4 },
                    cumulativeMovementCost: 4,
                },
                0
            )
            expectedResult.currentNumberOfMoveActions

            expect(searchPath).toEqual(expectedResult)
        })
    })
})
