import {Pathfinder} from "./pathfinder";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SearchParametersHelper} from "./searchParams";
import {SearchResults} from "./searchResults";
import {MissionMap} from "../../missionMap/missionMap";
import {createMap, validateTilesAreFound} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate, NewHexCoordinateFromNumberPair} from "../hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";

describe('pathfinding with a single move', () => {
    beforeEach(() => {
    });

    it('shows all of the tiles that can be reached from a single move', () => {
        const {
            missionMap,
        } = createMap([
            "  1 1 1 ",
            " 1 1 1 1 ",
            "  1 1 1 ",
        ])

        const origin: HexCoordinate = {q: 1, r: 1};
        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: origin,
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 1,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
                    }
                }
            ),
            missionMap,
            new BattleSquaddieRepository(),
        ));

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
        } = createMap([
            "  1 1 1 ",
            " 1 1 1 1 ",
            "  1 1 1 ",
        ])

        const shouldThrowError = () => {
            getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: undefined,
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                missionMap,
                new BattleSquaddieRepository(),
            ));
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
        } = createMap([
            "1 2 1 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 10,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: 2,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
                    }
                }
            ),
            missionMap,
            new BattleSquaddieRepository(),
        ));

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
        } = createMap([
            "1 2 2 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 10,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                        maximumDistanceMoved: 2,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
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
            ],
            [
                {q: 0, r: 3,},
            ]
        );
    });

    it('factors movement costs for rough terrain', () => {
        const {
            missionMap,
        } = createMap([
            "1 1 1 2 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 1},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 2,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
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
            } = createMap(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 2,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
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
            } = createMap(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 3,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
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
            } = createMap(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 3,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
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
            } = createMap(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 3,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: true,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
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
            } = createMap(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 2,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: true,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
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
                ],
                [
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ]
            );
        });
    });

    describe('tiles within range of single tile', () => {
        let justTheCenter: HexCoordinate[];
        let tilesNotFoundBecauseSearchBlockedByWall: HexCoordinate[];
        let tilesWithin2HexesOfOrigin: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
            } = createMap([
                '1 1 ',
                ' 1 1 1 x 1 ',
                '  x 1 1 ',
                '   1 ',
            ]);

            missionMap = tempMissionMap;

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
            const noTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: undefined,
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                0,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
            );

            expect(noTiles).toHaveLength(0);
        });

        it('can only includes itself with radius 0', () => {
            const centerTileOnly: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                0,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
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
            const centerAndAdjacentTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                1,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
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
            const centerAndAdjacentTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                2,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
            );
            validateTilesAreFound(
                centerAndAdjacentTiles,
                tilesWithin2HexesOfOrigin,
                tilesNotFoundBecauseSearchBlockedByWall
            );
        });

        it('can spread from multiple tiles', () => {
            const movementRangeTiles: HexCoordinate[] = [...justTheCenter, {q: 1, r: 2},];
            const meleeAttackTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: undefined,
                        }
                    }
                ),
                1,
                movementRangeTiles,
                missionMap,
                new BattleSquaddieRepository(),
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
        let justTheCenter: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
            } = createMap([
                '1 1 1 1 ',
                ' 1 1 1 1 x 1 ',
                '  1 1 ',
                '   1 ',
                '    1 ',
                '     1 ',
            ]);

            missionMap = tempMissionMap;

            justTheCenter = [
                {q: 1, r: 1},
            ];
        });

        it('single tile', () => {
            const movementRangeTiles: HexCoordinate[] = [
                ...justTheCenter,
            ];

            const indirectAttackTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: 2,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: undefined,
                        }
                    }
                ),
                3,
                movementRangeTiles,
                missionMap,
                new BattleSquaddieRepository(),
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

            const indirectAttackTiles: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 1,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: 2,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: undefined,
                        }
                    }
                ),
                3,
                movementRangeTiles,
                missionMap,
                new BattleSquaddieRepository(),
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
        let justTheCenter: HexCoordinate[];
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
            } = createMap([
                "1 x 1 ",
            ]);

            missionMap = tempMissionMap;

            justTheCenter = [
                {q: 0, r: 0},
            ];
        });

        it('can be blocked by walls', () => {
            const blockedByWall: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: undefined,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: undefined,
                        }
                    }
                ),
                2,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
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
            const skipPastWalls: HexCoordinate[] = Pathfinder.getTilesInRange(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                            affiliation: SquaddieAffiliation.UNKNOWN,
                        },
                        movement: {
                            movementPerAction: 3,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: true,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: true,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                2,
                justTheCenter,
                missionMap,
                new BattleSquaddieRepository(),
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
