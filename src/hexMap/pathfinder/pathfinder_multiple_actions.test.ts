import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "./searchParams";
import {SearchResults} from "./searchResults";
import {
    createMapAndPathfinder,
    validateTileHasExpectedNumberOfActions,
    validateTilesAreFound
} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

describe('pathfinder move with multiple movement actions', () => {
    let mapOneRowFourColumns: string[];

    beforeEach(() => {
        mapOneRowFourColumns = [
            "1 1 1 1 "
        ];
    });

    it('can report on how many movement actions it took', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(mapOneRowFourColumns);

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            }),
            movement: new SearchMovement({
                movementPerAction: 1,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActions: 2,
            })
        })));
        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                new HexCoordinate({q: 0, r: 0,}),
                new HexCoordinate({q: 0, r: 1,}),
                new HexCoordinate({q: 0, r: 2,}),
            ],
            [
                new HexCoordinate({q: 0, r: 3,}),
            ]
        );

        validateTileHasExpectedNumberOfActions(0, 0, 0, searchResults)
        validateTileHasExpectedNumberOfActions(0, 1, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 2, 2, searchResults)
    });

    it('discards excess movement between actions', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 2 "
        ]);

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            }),
            movement: new SearchMovement({
                movementPerAction: 2,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActions: 2,
            })
        })));
        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                new HexCoordinate({q: 0, r: 0,}),
                new HexCoordinate({q: 0, r: 1,}),
                new HexCoordinate({q: 0, r: 2,}),
                new HexCoordinate({q: 0, r: 3,}),
            ],
            []
        );

        validateTileHasExpectedNumberOfActions(0, 0, 0, searchResults)
        validateTileHasExpectedNumberOfActions(0, 1, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 2, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 3, 2, searchResults)
    });
});
