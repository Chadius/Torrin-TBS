import {SearchParametersHelper} from "./searchParams";
import {SearchResults} from "./searchResults";
import {createMap, validateTileHasExpectedNumberOfActions, validateTilesAreFound} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GetTargetingShapeGenerator, TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {Pathfinder} from "./pathfinder";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";

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

        } = createMap(mapOneRowFourColumns);

        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 1,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 2,
                    }
                }
            ),
            missionMap,
            new BattleSquaddieRepository(),
        ));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                {q: 0, r: 0},
                {q: 0, r: 1},
                {q: 0, r: 2},
            ],
            [
                {q: 0, r: 3,}
            ]
        )


        validateTileHasExpectedNumberOfActions(0, 0, 0, searchResults)
        validateTileHasExpectedNumberOfActions(0, 1, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 2, 2, searchResults)
    });

    it('discards excess movement between actions', () => {
        const {
            missionMap,

        } = createMap([
            "1 1 1 2 "
        ]);

        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 2,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 2,
                    }
                }
            ),
            missionMap,
            new BattleSquaddieRepository(),
        ));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                {q: 0, r: 0,},
                {q: 0, r: 1,},
                {q: 0, r: 2,},
                {q: 0, r: 3,},
            ],
            [],
        )

        validateTileHasExpectedNumberOfActions(0, 0, 0, searchResults)
        validateTileHasExpectedNumberOfActions(0, 1, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 2, 1, searchResults)
        validateTileHasExpectedNumberOfActions(0, 3, 2, searchResults)
    });
});
