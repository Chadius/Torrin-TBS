import { beforeEach, describe, expect, it } from "vitest"
import { SearchPathAdapterService } from "./searchPathAdapter"
import { SearchConnection } from "../searchGraph/graph"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

describe("search path adapter", () => {
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
        it("getMostRecentCoordinate", () => {
            expect(SearchPathAdapterService.getHead(connections)).toEqual({
                q: 1,
                r: 4,
            })
        })
        it("getCoordinates", () => {
            expect(
                SearchPathAdapterService.getCoordinates(connections)
            ).toEqual([
                { q: 0, r: 2 },
                { q: 0, r: 3 },
                { q: 0, r: 4 },
                { q: 1, r: 4 },
            ])
        })
        it("compare", () => {
            const connectionsB: SearchConnection<HexCoordinate>[] = []
            expect(
                SearchPathAdapterService.compare(connections, connectionsB)
            ).toBeGreaterThan(0)
        })
        it("getNumberOfMoveActions", () => {
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: connections,
                    movementPerAction: 3,
                })
            ).toEqual(2)
        })
        describe("getNumberOfCoordinates", () => {
            it("a undefined object has 0 coordinates", () => {
                expect(
                    SearchPathAdapterService.getNumberOfCoordinates(undefined)
                ).toEqual(0)
            })
            it("an empty list has 1 coordinate", () => {
                expect(
                    SearchPathAdapterService.getNumberOfCoordinates([])
                ).toEqual(1)
            })
            it("an single connection with the same start and end has 1 coordinate", () => {
                expect(
                    SearchPathAdapterService.getNumberOfCoordinates([
                        {
                            fromNode: { q: 0, r: 2 },
                            toNode: { q: 0, r: 2 },
                            cost: 0,
                        },
                    ])
                ).toEqual(1)
            })
            it("an single connection with different start and end nodes has 2 coordinate", () => {
                expect(
                    SearchPathAdapterService.getNumberOfCoordinates([
                        {
                            fromNode: { q: 0, r: 2 },
                            toNode: { q: 0, r: 3 },
                            cost: 1,
                        },
                    ])
                ).toEqual(2)
            })
            it("multiple connections add 1 coordinate per", () => {
                expect(
                    SearchPathAdapterService.getNumberOfCoordinates([
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
                    ])
                ).toEqual(3)
            })
        })
    })
})
