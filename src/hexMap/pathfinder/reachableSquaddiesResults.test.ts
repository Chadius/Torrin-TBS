import {ReachableSquaddieDescription, ReachableSquaddiesResults} from "./reachableSquaddiesResults";

describe('Reachable Squaddies Results', () => {
    it('can add squaddies by distance', () => {
        const results: ReachableSquaddiesResults = new ReachableSquaddiesResults();
        results.addSquaddie("soldier_0", {q: 0, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 0, {q: 0, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 0, r: 1});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 1, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 1, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 2, {q: 0, r: 2});
        results.addCoordinateCloseToSquaddie("soldier_0", 2, {q: 1, r: 1});

        const soldierDistanceResults = results.getCoordinatesCloseToSquaddieByDistance("soldier_0");
        expect(soldierDistanceResults.squaddieMapLocation).toStrictEqual({q: 0, r: 0})
        expect(soldierDistanceResults.closestCoordinatesByDistance[0]).toHaveLength(1);
        expect(soldierDistanceResults.closestCoordinatesByDistance[0]).toContainEqual({q: 0, r: 0});
        expect(soldierDistanceResults.closestCoordinatesByDistance[1]).toHaveLength(2);
        expect(soldierDistanceResults.closestCoordinatesByDistance[1]).toContainEqual({q: 0, r: 1});
        expect(soldierDistanceResults.closestCoordinatesByDistance[1]).toContainEqual({q: 1, r: 0});
        expect(soldierDistanceResults.closestCoordinatesByDistance[2]).toHaveLength(2);
        expect(soldierDistanceResults.closestCoordinatesByDistance[2]).toContainEqual({q: 0, r: 2});
        expect(soldierDistanceResults.closestCoordinatesByDistance[2]).toContainEqual({q: 1, r: 1});
        expect(soldierDistanceResults.closestCoordinatesByDistance[3]).toBeUndefined();
        expect(soldierDistanceResults.getClosestAdjacentDistanceToSquaddie()).toBe(1);

        const doesNotExistResults: ReachableSquaddieDescription = results.getCoordinatesCloseToSquaddieByDistance("does not exist");
        expect(doesNotExistResults).toBeUndefined();
    });
});
