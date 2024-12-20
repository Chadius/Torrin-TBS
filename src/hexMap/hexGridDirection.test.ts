import {
    HexDirection,
    HexGridService,
    MoveCoordinatesInOneDirection,
    moveOneTileInDirection,
} from "./hexGridDirection"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { beforeEach, describe, expect, it } from "vitest"

describe("Hex Grid Helper", () => {
    describe("Move Hex Coordinate in one direction", () => {
        let origin: HexCoordinate
        beforeEach(() => {
            origin = { q: 0, r: 0 }
        })

        it("Can stay at origin", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.ORIGIN
            )
            expect(destination.q).toBe(origin.q)
            expect(destination.r).toBe(origin.r)
        })

        it("Can move right", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.RIGHT
            )
            expect(destination.q).toBe(origin.q)
            expect(destination.r).toBe(origin.r + 1)
        })

        it("Can move left", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.LEFT
            )
            expect(destination.q).toBe(origin.q)
            expect(destination.r).toBe(origin.r - 1)
        })

        it("Can move down and right", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.DOWN_RIGHT
            )
            expect(destination.q).toBe(origin.q + 1)
            expect(destination.r).toBe(origin.r)
        })

        it("Can move down and left", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.DOWN_LEFT
            )
            expect(destination.q).toBe(origin.q + 1)
            expect(destination.r).toBe(origin.r - 1)
        })

        it("Can move up and left", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.UP_LEFT
            )
            expect(destination.q).toBe(origin.q - 1)
            expect(destination.r).toBe(origin.r)
        })

        it("Can move up and right", () => {
            const destination = moveOneTileInDirection(
                origin,
                HexDirection.UP_RIGHT
            )
            expect(destination.q).toBe(origin.q - 1)
            expect(destination.r).toBe(origin.r + 1)
        })
    })

    describe("Move q r coordinates in one direction", () => {
        it("Can stay at origin", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.ORIGIN
            )
            expect(destination.q).toBe(0)
            expect(destination.r).toBe(0)
        })

        it("Can move right", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.RIGHT
            )
            expect(destination.q).toBe(0)
            expect(destination.r).toBe(1)
        })

        it("Can move left", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.LEFT
            )
            expect(destination.q).toBe(0)
            expect(destination.r).toBe(-1)
        })

        it("Can move down and right", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.DOWN_RIGHT
            )
            expect(destination.q).toBe(+1)
            expect(destination.r).toBe(0)
        })

        it("Can move down and left", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.DOWN_LEFT
            )
            expect(destination.q).toBe(1)
            expect(destination.r).toBe(-1)
        })

        it("Can move up and left", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.UP_LEFT
            )
            expect(destination.q).toBe(-1)
            expect(destination.r).toBe(0)
        })

        it("Can move up and right", () => {
            const destination = MoveCoordinatesInOneDirection(
                0,
                0,
                HexDirection.UP_RIGHT
            )
            expect(destination.q).toBe(-1)
            expect(destination.r).toBe(1)
        })
    })

    describe("Generate offsets of a certain radius", () => {
        it("generates a ring of 0 around the origin", () => {
            const radius0: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundOrigin(0)
            expect(radius0).toHaveLength(1)
            expect(radius0).toContainEqual({ q: 0, r: 0 })
        })
        it("generates a ring of 1 around the origin", () => {
            const radius1: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundOrigin(1)
            expect(radius1).toHaveLength(6)
            expect(radius1).toContainEqual({ q: 0, r: 1 })
            expect(radius1).toContainEqual({ q: -1, r: 1 })
            expect(radius1).toContainEqual({ q: -1, r: 0 })
            expect(radius1).toContainEqual({ q: 0, r: -1 })
            expect(radius1).toContainEqual({ q: 1, r: -1 })
            expect(radius1).toContainEqual({ q: 1, r: 0 })
            expect(radius1).toContainEqual({ q: -1, r: 1 })
        })
        it("generates a ring of 2 around the origin", () => {
            const radius2: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundOrigin(2)
            expect(radius2).toHaveLength(12)
            expect(radius2).toContainEqual({ q: 0, r: 2 })

            expect(radius2).toContainEqual({ q: -1, r: 2 })
            expect(radius2).toContainEqual({ q: -2, r: 2 })

            expect(radius2).toContainEqual({ q: -2, r: 1 })
            expect(radius2).toContainEqual({ q: -2, r: 0 })

            expect(radius2).toContainEqual({ q: -1, r: -1 })
            expect(radius2).toContainEqual({ q: 0, r: -2 })

            expect(radius2).toContainEqual({ q: 1, r: -2 })
            expect(radius2).toContainEqual({ q: 2, r: -2 })

            expect(radius2).toContainEqual({ q: 2, r: -1 })
            expect(radius2).toContainEqual({ q: 2, r: 0 })

            expect(radius2).toContainEqual({ q: 1, r: 1 })
        })
        it("generates a ring around a given coordinate", () => {
            const radius2: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundCoordinate(
                    { q: 3, r: 5 },
                    2
                )
            expect(radius2).toHaveLength(12)
            expect(radius2).toContainEqual({ q: 3, r: 7 })

            expect(radius2).toContainEqual({ q: 2, r: 7 })
            expect(radius2).toContainEqual({ q: 1, r: 7 })

            expect(radius2).toContainEqual({ q: 1, r: 6 })
            expect(radius2).toContainEqual({ q: 1, r: 5 })

            expect(radius2).toContainEqual({ q: 2, r: 4 })
            expect(radius2).toContainEqual({ q: 1, r: 5 })

            expect(radius2).toContainEqual({ q: 4, r: 3 })
            expect(radius2).toContainEqual({ q: 5, r: 3 })

            expect(radius2).toContainEqual({ q: 5, r: 4 })
            expect(radius2).toContainEqual({ q: 5, r: 5 })

            expect(radius2).toContainEqual({ q: 4, r: 6 })
        })
    })
})
