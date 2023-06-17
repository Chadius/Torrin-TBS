import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";
import {SearchResults} from "./searchResults";
import {
    createMapAndPathfinder,
    createSquaddieMovements,
    validateTileHasExpectedNumberOfActions,
    validateTilesAreFound
} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

describe('pathfinder move with multiple movement actions', () => {
    let squaddieMovementOneMovementPerAction: SquaddieMovement;
    let squaddieMovementTwoMovementPerAction: SquaddieMovement;
    let squaddieMovementThreeMovementPerAction: SquaddieMovement;
    let squaddieMovementHighMovementPerAction: SquaddieMovement;
    let mapOneRowFourColumns: string[];

    beforeEach(() => {
        ({
            squaddieMovementOneMovementPerAction,
            squaddieMovementTwoMovementPerAction,
            squaddieMovementThreeMovementPerAction,
            squaddieMovementHighMovementPerAction
        } = createSquaddieMovements());

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
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 2,
            startLocation: new HexCoordinate({q: 0, r: 0})
        })));
        validateTilesAreFound(
            searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
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
            missionMap: missionMap,
            squaddieMovement: squaddieMovementTwoMovementPerAction,
            numberOfActions: 2,
            startLocation: new HexCoordinate({q: 0, r: 0})
        })));
        validateTilesAreFound(
            searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
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
