import {SearchResultsHelper} from "./searchResult";
import {SearchPathHelper} from "../searchPath";

describe('Search Results', () => {
    it('Can organize locations by the number of move actions', () => {
        const results = SearchResultsHelper.new({
            shortestPathByLocation: {
                0: {
                    0: {
                        ...SearchPathHelper.newSearchPath(),
                        tilesTraveled: [
                            {
                                hexCoordinate: {q: 0, r: 0},
                                cumulativeMovementCost: 0,
                            }
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    1: {
                        ...SearchPathHelper.newSearchPath(),
                        tilesTraveled: [
                            {
                                hexCoordinate: {q: 0, r: 0},
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: {q: 0, r: 1},
                                cumulativeMovementCost: 0,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    2: {
                        ...SearchPathHelper.newSearchPath(),
                        tilesTraveled: [
                            {
                                hexCoordinate: {q: 0, r: 0},
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: {q: 0, r: 1},
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: {q: 0, r: 2},
                                cumulativeMovementCost: 2,
                            },
                        ],
                        currentNumberOfMoveActions: 1,
                    },
                    3: {
                        ...SearchPathHelper.newSearchPath(),
                        tilesTraveled: [
                            {
                                hexCoordinate: {q: 0, r: 0},
                                cumulativeMovementCost: 0,
                            },
                            {
                                hexCoordinate: {q: 0, r: 1},
                                cumulativeMovementCost: 1,
                            },
                            {
                                hexCoordinate: {q: 0, r: 2},
                                cumulativeMovementCost: 2,
                            },
                            {
                                hexCoordinate: {q: 0, r: 3},
                                cumulativeMovementCost: 4,
                            },
                        ],
                        currentNumberOfMoveActions: 2,
                    },
                },
            }
        });

        const locationsByNumberOfMoveActions = SearchResultsHelper.getLocationsByNumberOfMoveActions(results);

        expect(locationsByNumberOfMoveActions).toEqual({
            1: [
                {q: 0, r: 0},
                {q: 0, r: 1},
                {q: 0, r: 2},
            ],
            2: [
                {q: 0, r: 3},
            ],
        })
    });
});
