import {
    ReachableSquaddieDescription,
    ReachableSquaddiesResults,
} from "./reachableSquaddiesResults"

describe("Reachable Squaddies Results", () => {
    it("can add squaddies by distance", () => {
        const results: ReachableSquaddiesResults =
            new ReachableSquaddiesResults()
        results.addSquaddie("soldier_0", { q: 0, r: 0 })
        results.addCoordinateCloseToSquaddie("soldier_0", 0, { q: 0, r: 0 })
        results.addCoordinateCloseToSquaddie("soldier_0", 1, { q: 0, r: 1 })
        results.addCoordinateCloseToSquaddie("soldier_0", 1, { q: 1, r: 0 })
        results.addCoordinateCloseToSquaddie("soldier_0", 1, { q: 1, r: 0 })
        results.addCoordinateCloseToSquaddie("soldier_0", 2, { q: 0, r: 2 })
        results.addCoordinateCloseToSquaddie("soldier_0", 2, { q: 1, r: 1 })

        const soldierDistanceResults =
            results.getCoordinatesCloseToSquaddieByDistance("soldier_0")
        expect(soldierDistanceResults.squaddieMapLocation).toStrictEqual({
            q: 0,
            r: 0,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                0
            )
        ).toHaveLength(1)
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                0
            )
        ).toContainEqual({
            q: 0,
            r: 0,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                1
            )
        ).toHaveLength(2)
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                1
            )
        ).toContainEqual({
            q: 0,
            r: 1,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                1
            )
        ).toContainEqual({
            q: 1,
            r: 0,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                2
            )
        ).toHaveLength(2)
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                2
            )
        ).toContainEqual({
            q: 0,
            r: 2,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                2
            )
        ).toContainEqual({
            q: 1,
            r: 1,
        })
        expect(
            soldierDistanceResults.closestCoordinatesByDistance.getCoordinatesByDistance(
                3
            )
        ).toStrictEqual([])
        expect(
            soldierDistanceResults.getClosestAdjacentDistanceToSquaddieWithinRange()
        ).toBe(1)
        expect(
            soldierDistanceResults.getClosestAdjacentDistanceToSquaddieWithinRange(
                1
            )
        ).toBe(1)
        expect(
            soldierDistanceResults.getClosestAdjacentDistanceToSquaddieWithinRange(
                2
            )
        ).toBe(2)
        expect(
            soldierDistanceResults.getClosestAdjacentDistanceToSquaddieWithinRange(
                3
            )
        ).toBeUndefined()

        const doesNotExistResults: ReachableSquaddieDescription =
            results.getCoordinatesCloseToSquaddieByDistance("does not exist")
        expect(doesNotExistResults).toBeUndefined()
    })
})
