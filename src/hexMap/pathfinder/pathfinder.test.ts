import {Pathfinder} from "./pathfinder";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "./searchParams";
import {SearchResults} from "./searchResults";
import {MissionMap} from "../../missionMap/missionMap";
import {createMapAndPathfinder, validateTilesAreFound} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate, NewHexCoordinateFromNumberPair} from "../hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

describe('pathfinding with a single move', () => {
    beforeEach(() => {
    });

    it('shows all of the tiles that can be reached from a single move', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "  1 1 1 ",
            " 1 1 1 1 ",
            "  1 1 1 ",
        ])

        const origin: HexCoordinate = {q: 1, r: 1};
        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: origin,
            }),
            movement: new SearchMovement({
                movementPerAction: 1,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
            })
        })));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                moveOneTileInDirection(origin, HexDirection.ORIGIN),
                moveOneTileInDirection(origin, HexDirection.RIGHT),
                moveOneTileInDirection(origin, HexDirection.LEFT),
                moveOneTileInDirection(origin, HexDirection.UP_LEFT),
                moveOneTileInDirection(origin, HexDirection.UP_RIGHT),
                moveOneTileInDirection(origin, HexDirection.DOWN_LEFT),
                moveOneTileInDirection(origin, HexDirection.DOWN_RIGHT),
            ],
            []
        );
    });

    it('shows no tiles are reachable if SearchParams has no start location', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "  1 1 1 ",
            " 1 1 1 1 ",
            "  1 1 1 ",
        ])

        const shouldThrowError = () => {
            getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                }),
                movement: new SearchMovement({
                    movementPerAction: 1,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("no starting location provided");
    });

    it('can factor a minimum distance to movement', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 2 1 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: {q: 0, r: 0},
            }),
            movement: new SearchMovement({
                movementPerAction: 10,
                minimumDistanceMoved: 2,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
            })
        })));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                {q: 0, r: 2,},
                {q: 0, r: 3,},
            ],
            [
                {q: 0, r: 0,},
                {q: 0, r: 1,},
            ]
        );
    });

    it('can factor a maximum distance to movement', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 2 2 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: {q: 0, r: 0},
            }),
            movement: new SearchMovement({
                movementPerAction: 10,
                maximumDistanceMoved: 2,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
            })
        })));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                {q: 0, r: 0,},
                {q: 0, r: 1,},
                {q: 0, r: 2,},
            ],
            [
                {q: 0, r: 3,},
            ]
        );
    });

    it('factors movement costs for rough terrain', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 2 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: {q: 0, r: 1},
            }),
            movement: new SearchMovement({
                movementPerAction: 2,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
            })
        })));

        validateTilesAreFound(
            searchResults.getReachableTiles(),
            [
                {q: 0, r: 0,},
                {q: 0, r: 1,},
                {q: 0, r: 2,},
            ],
            [
                {q: 0, r: 3,},
                {q: 0, r: 4,},
            ]
        );
    });

    describe('wall movement', () => {
        let mapOneRowWithAWallBlockingTheEnd: string[];
        let wallTile: HexCoordinate[];

        beforeEach(() => {
            mapOneRowWithAWallBlockingTheEnd = [
                "1 1 x 1 "
            ];

            wallTile = [
                {q: 0, r: 2},
            ];
        });

        it('will not search walls if movement cannot pass through walls', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: {q: 0, r: 0},
                }),
                movement: new SearchMovement({
                    movementPerAction: 2,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));

            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                ],
                [
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ]
            );
        });

        it('will search through walls if movement can pass through walls', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: {q: 0, r: 0},
                }),
                movement: new SearchMovement({
                    movementPerAction: 3,
                    passThroughWalls: true,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));

            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                    {q: 0, r: 3,},
                ],
                wallTile
            );
        });
    });

    describe('crossing pits', () => {
        let mapOneRowWithAPitBlockingTheEnd: string[];
        beforeEach(() => {
            mapOneRowWithAPitBlockingTheEnd = [
                "1 1 - 1 "
            ];
        });

        it('will not cross pits if specified', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: {q: 0, r: 0},
                }),
                movement: new SearchMovement({
                    movementPerAction: 3,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));

            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                ],
                [
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ]
            );
        });

        it('can cross pits', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: {q: 0, r: 0},
                }),
                movement: new SearchMovement({
                    movementPerAction: 3,
                    crossOverPits: true,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));

            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                    {q: 0, r: 3,},
                ],
                [
                    {q: 0, r: 2,},
                ]
            );
        });

        it('will not cross pits if movement is limited', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: {q: 0, r: 0},
                }),
                movement: new SearchMovement({
                    movementPerAction: 2,
                    crossOverPits: true,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));

            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                ],
                [
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ]
            );
        });
    });

    describe('tiles within range of single tile', () => {
        let pathfinder: Pathfinder;
        let justTheCenter: HexCoordinate[];
        let tilesNotFoundBecauseSearchBlockedByWall: HexCoordinate[];
        let tilesWithin2HexesOfOrigin: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
                pathfinder: tempPathfinder,
            } = createMapAndPathfinder([
                '1 1 ',
                ' 1 1 1 x 1 ',
                '  x 1 1 ',
                '   1 ',
            ]);

            missionMap = tempMissionMap;
            pathfinder = tempPathfinder;

            justTheCenter = [
                {q: 1, r: 1}
            ];

            tilesNotFoundBecauseSearchBlockedByWall = [
                {q: 1, r: 3},
                {q: 1, r: 4},
            ];

            tilesWithin2HexesOfOrigin = [
                moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
                moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),

                {q: 0, r: 0},
                {q: 2, r: 2},
                {q: 3, r: 0},
            ];
        });

        it('returns nothing if no start location is provided', () => {
            const noTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        passThroughWalls: true,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        numberOfActionPoints: 1,
                    })
                }),
                0,
                justTheCenter
            );

            expect(noTiles).toHaveLength(0);
        });

        it('can only includes itself with radius 0', () => {
            const centerTileOnly: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: {q: 0, r: 0},
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        passThroughWalls: true,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        numberOfActionPoints: 1,
                    })
                }),
                0,
                justTheCenter,
            );
            validateTilesAreFound(
                centerTileOnly,
                [
                    {q: 1, r: 1,},
                ],
                [
                    {q: 2, r: 1,},
                    {q: 1, r: 2,},
                ]
            );
        });

        it('Radius 1 should get all within 1 movement', () => {
            const centerAndAdjacentTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: {q: 0, r: 0},
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        passThroughWalls: true,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        numberOfActionPoints: 1,
                    })
                }),
                1,
                justTheCenter,
            );
            validateTilesAreFound(
                centerAndAdjacentTiles,
                [
                    moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),
                ],
                [
                    moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_RIGHT),
                ]
            );
        });

        it('can find tiles within 2 tiles of the center, besides walls', () => {
            const centerAndAdjacentTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: {q: 0, r: 0},
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        passThroughWalls: true,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({
                        numberOfActionPoints: 1,
                    })
                }),
                2,
                justTheCenter,
            );
            validateTilesAreFound(
                centerAndAdjacentTiles,
                tilesWithin2HexesOfOrigin,
                tilesNotFoundBecauseSearchBlockedByWall
            );
        });

        it('can spread from multiple tiles', () => {
            const movementRangeTiles: HexCoordinate[] = [...justTheCenter, {q: 1, r: 2},];
            const meleeAttackTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({})
                }),
                1,
                movementRangeTiles,
            );
            validateTilesAreFound(
                meleeAttackTiles,
                [
                    moveOneTileInDirection(movementRangeTiles[0], HexDirection.ORIGIN),
                    moveOneTileInDirection(movementRangeTiles[0], HexDirection.RIGHT),
                    moveOneTileInDirection(movementRangeTiles[0], HexDirection.LEFT),
                    moveOneTileInDirection(movementRangeTiles[0], HexDirection.UP_LEFT),
                    moveOneTileInDirection(movementRangeTiles[0], HexDirection.DOWN_RIGHT),

                    moveOneTileInDirection(movementRangeTiles[1], HexDirection.DOWN_RIGHT),
                ],
                tilesNotFoundBecauseSearchBlockedByWall
            );
        });
    });

    describe('spread with minimum range', () => {
        let pathfinder: Pathfinder;
        let justTheCenter: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
                pathfinder: tempPathfinder,
            } = createMapAndPathfinder([
                '1 1 1 1 ',
                ' 1 1 1 1 x 1 ',
                '  1 1 ',
                '   1 ',
                '    1 ',
                '     1 ',
            ]);

            missionMap = tempMissionMap;
            pathfinder = tempPathfinder;

            justTheCenter = [
                {q: 1, r: 1},
            ];
        });

        it('single tile', () => {
            const movementRangeTiles: HexCoordinate[] = [
                ...justTheCenter,
            ];

            const indirectAttackTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                    }),
                    movement: new SearchMovement({
                        minimumDistanceMoved: 2,
                        movementPerAction: 1,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({})
                }),
                3,
                movementRangeTiles,
            );

            validateTilesAreFound(
                indirectAttackTiles,
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 3,},
                    {q: 1, r: 3,},
                    {q: 3, r: 0,},
                    {q: 4, r: 0,},
                ],
                [
                    moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_LEFT),

                    {q: 1, r: 5,},

                    {q: 5, r: 0,},
                ]
            );
        });

        it('multiple tiles are combined', () => {
            const movementRangeTiles: HexCoordinate[] = [
                ...justTheCenter,
                {q: 1, r: 2},
            ];

            const indirectAttackTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 1,
                        minimumDistanceMoved: 2,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({})
                }),
                3,
                movementRangeTiles,
            );
            validateTilesAreFound(
                indirectAttackTiles,
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 3,},
                    {q: 1, r: 3,},
                    {q: 2, r: 0,},
                    {q: 3, r: 0,},
                    {q: 4, r: 0,},
                    moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
                ],
                [
                    moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.UP_RIGHT),
                    moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),

                    {q: 1, r: 5,},
                    {q: 5, r: 0,},
                ]
            );
        });
    });

    describe('spread within range with walls', () => {
        let pathfinder: Pathfinder;
        let justTheCenter: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
                pathfinder: tempPathfinder,
            } = createMapAndPathfinder([
                "1 x 1 ",
            ]);

            missionMap = tempMissionMap;
            pathfinder = tempPathfinder;

            justTheCenter = [
                {q: 0, r: 0},
            ];
        });

        it('can be blocked by walls', () => {
            const blockedByWall: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                    }),
                    movement: new SearchMovement({
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({})
                }),
                2,
                justTheCenter,
            );
            validateTilesAreFound(
                blockedByWall,
                [
                    {q: 0, r: 0,},
                ],
                [
                    {q: 0, r: 1,},
                    {q: 0, r: 2,},
                ]
            );
        });

        it('can target through walls', () => {
            const skipPastWalls: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
                    setup: new SearchSetup({
                        missionMap: missionMap,
                        startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                    }),
                    movement: new SearchMovement({
                        movementPerAction: 3,
                        passThroughWalls: true,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                    }),
                    stopCondition: new SearchStopCondition({})
                }),
                2,
                justTheCenter,
            );
            validateTilesAreFound(
                skipPastWalls,
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 2,},
                ],
                [
                    {q: 0, r: 1,},
                ]
            );
        });
    });
});
