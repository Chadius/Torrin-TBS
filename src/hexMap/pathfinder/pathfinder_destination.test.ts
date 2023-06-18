import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {getResultOrThrowError, isError, ResultOrError, unwrapResultOrError} from "../../utils/ResultOrError";
import {createMapAndPathfinder, createSquaddieMovements} from "./pathfinder_test_utils";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

describe('pathfinder reaching a destination', () => {
    let squaddieMovementOneMovementPerAction: SquaddieMovement;
    let squaddieMovementTwoMovementPerAction: SquaddieMovement;
    let squaddieMovementThreeMovementPerAction: SquaddieMovement;
    let squaddieMovementHighMovementPerAction: SquaddieMovement;
    let smallMap: string[];

    beforeEach(() => {
        ({
            squaddieMovementOneMovementPerAction,
            squaddieMovementTwoMovementPerAction,
            squaddieMovementThreeMovementPerAction,
            squaddieMovementHighMovementPerAction
        } = createSquaddieMovements());

        smallMap = [
            "1 1 "
        ];
    });

    it('gets results for a simple map', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(smallMap);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 0, r: 1}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);

        expect(routeFound.getTotalMovementCost()).toEqual(1);
        expect(routeFound.getDestination()).toStrictEqual(new HexCoordinate({
            q: 0,
            r: 1,
        }));
        expect(routeFound.getMostRecentTileLocation()).toStrictEqual(
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 1}),
                movementCost: 1
            }),
        );
        expect(routeFound.getTilesTraveled()).toStrictEqual([
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                movementCost: 0
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 1}),
                movementCost: 1
            }),
        ])
    });

    it('throws an error if no stopLocation is provided', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(smallMap);

        const somePathOrError = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let errorFound: Error;
        if (isError(somePathOrError)) {
            errorFound = unwrapResultOrError(somePathOrError);
        }

        expect(errorFound).toEqual(expect.any(Error));
        expect((errorFound as Error).message.includes("no stop location was given")).toBeTruthy();
    });

    it('throws an error if results object has no stop location', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(smallMap);

        const allTiles = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            shapeGeneratorType: TargetingShape.Snake,
        })));

        let somePathOrError = allTiles.getRouteToStopLocation();

        expect(isError(somePathOrError)).toBeTruthy();
        const errorObject = unwrapResultOrError(somePathOrError);
        expect(errorObject).toEqual(expect.any(Error));
        expect((errorObject as Error).message.includes("no stop location was given")).toBeTruthy();
    });

    it('returns null if there is no closest route to a given location', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(smallMap);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 9000, r: 2}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        expect(routeFound).toBeNull();
    });

    it('can stop on the tile it starts on', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder(smallMap);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 0, r: 0}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);

        expect(routeFound.getTotalMovementCost()).toEqual(0);
        expect(routeFound.getDestination()).toStrictEqual(new HexCoordinate({
            q: 0,
            r: 0,
        }));
        expect(routeFound.getMostRecentTileLocation()).toStrictEqual(
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                movementCost: 0
            }),
        );
        expect(routeFound.getTilesTraveled()).toStrictEqual([
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                movementCost: 0
            }),
        ]);
    });

    it('chooses the route with the fewest number of tiles if all tiles have the same movement cost', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 x x ",
            " 1 x x ",
            "  1 1 1 ",
        ]);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementTwoMovementPerAction,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 2, r: 2}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);

        expect(routeFound.getTotalMovementCost()).toEqual(4);
        expect(routeFound.getDestination()).toStrictEqual(new HexCoordinate({
            q: 2,
            r: 2,
        }));
        expect(routeFound.getMostRecentTileLocation()).toStrictEqual(
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 2, r: 2}),
                movementCost: 4
            }),
        );

        expect(routeFound.getTilesTraveled()).toStrictEqual([
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                movementCost: 0
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 1, r: 0}),
                movementCost: 1
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 2, r: 0}),
                movementCost: 2
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 2, r: 1}),
                movementCost: 3
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 2, r: 2}),
                movementCost: 4
            }),
        ]);

        expect(routeFound.getTilesTraveledByNumberOfMovementActions()).toStrictEqual([
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                    movementCost: 0
                }),
            ],
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 1, r: 0}),
                    movementCost: 1
                }),
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 2, r: 0}),
                    movementCost: 2
                }),
            ],
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 2, r: 1}),
                    movementCost: 3
                }),
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 2, r: 2}),
                    movementCost: 4
                }),
            ]
        ]);
    });

    it('chooses the route with the lowest movement cost', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 2 2 2 1 ",
            " 1 1 1 1 1 ",
        ]);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 0, r: 4}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);

        expect(routeFound.getTotalMovementCost()).toEqual(5);
        expect(routeFound.getTilesTraveled()).toStrictEqual([
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                movementCost: 0
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 1, r: 0}),
                movementCost: 1
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 1, r: 1}),
                movementCost: 2
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 1, r: 2}),
                movementCost: 3
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 1, r: 3}),
                movementCost: 4
            }),
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({q: 0, r: 4}),
                movementCost: 5
            }),
        ]);
    });

    it('will stop if it is out of movement actions', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 ",
        ]);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 2,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 0, r: 4}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        expect(routeFound).toBeNull();
    });

    it('gets as close as it can if the destination is blocked', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 - 1 ",
        ]);

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            startLocation: new HexCoordinate({q: 0, r: 0}),
            stopLocation: new HexCoordinate({q: 0, r: 4}),
            shapeGeneratorType: TargetingShape.Snake,
        }));

        let closestTilesToDestination: {
            coordinate: HexCoordinate,
            searchPath: SearchPath,
            distance: number
        }[];
        let routeFound: SearchPath;

        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        closestTilesToDestination = getResultOrThrowError(searchResults).getClosestTilesToDestination();
        expect(routeFound).toBeNull();

        expect(closestTilesToDestination).toHaveLength(3);
        expect(closestTilesToDestination[0]).toEqual(expect.objectContaining({
            coordinate: new HexCoordinate({q: 0, r: 2}),
            distance: 2,
        }));
        expect(closestTilesToDestination[1]).toEqual(expect.objectContaining({
            coordinate: new HexCoordinate({q: 0, r: 1}),
            distance: 3,
        }));
        expect(closestTilesToDestination[2]).toEqual(expect.objectContaining({
            coordinate: new HexCoordinate({q: 0, r: 0}),
            distance: 4,
        }));
    });

    it('can filter closest route by number of movement actions involved', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 ",
            " 1 1 x ",
            "  1 1 1 ",
        ]);

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 3,
            startLocation: new HexCoordinate({q: 1, r: 1}),
            stopLocation: new HexCoordinate({q: 2, r: 2}),
            shapeGeneratorType: TargetingShape.Snake,
        })));

        let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());
        expect(routeSortedByNumberOfMovementActions).toStrictEqual([
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 1, r: 1}),
                    movementCost: 0
                }),
            ],
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 2, r: 1}),
                    movementCost: 1
                }),
            ],
            [
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 2, r: 2}),
                    movementCost: 2
                }),
            ]
        ])
    });
});
