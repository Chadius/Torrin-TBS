import {HexCoordinatesByDistance, ReachableSquaddiesResults} from "./reachableSquaddiesResults";

describe('Reachable Squaddies Results', () => {
    it('can add squaddies by distance', () => {
        const results: ReachableSquaddiesResults = new ReachableSquaddiesResults();
        results.addCoordinateCloseToSquaddie("soldier_0", 0, {q: 0, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 0, r: 1});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 1, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 1, {q: 1, r: 0});
        results.addCoordinateCloseToSquaddie("soldier_0", 2, {q: 0, r: 2});
        results.addCoordinateCloseToSquaddie("soldier_0", 2, {q: 1, r: 1});

        const soldierDistanceResults: HexCoordinatesByDistance = results.getCoordinatesCloseToSquaddieByDistance("soldier_0");
        expect(soldierDistanceResults[0]).toHaveLength(1);
        expect(soldierDistanceResults[0]).toContainEqual({q: 0, r: 0});
        expect(soldierDistanceResults[1]).toHaveLength(2);
        expect(soldierDistanceResults[1]).toContainEqual({q: 0, r: 1});
        expect(soldierDistanceResults[1]).toContainEqual({q: 1, r: 0});
        expect(soldierDistanceResults[2]).toHaveLength(2);
        expect(soldierDistanceResults[2]).toContainEqual({q: 0, r: 2});
        expect(soldierDistanceResults[2]).toContainEqual({q: 1, r: 1});
        expect(soldierDistanceResults[3]).toBeUndefined();

        const doesNotExistResults: HexCoordinatesByDistance = results.getCoordinatesCloseToSquaddieByDistance("does not exist");
        expect(doesNotExistResults).toBeUndefined();
    });
});
