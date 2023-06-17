import {Pathfinder} from "./pathfinder";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {createMapAndPathfinder, createSquaddieMovements, validateTilesAreFound} from "./pathfinder_test_utils";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate, NewHexCoordinateFromNumberPair} from "../hexCoordinate/hexCoordinate";

describe('pathfinding with a single move', () => {
    let squaddieMovementOneMovementPerAction: SquaddieMovement;
    let squaddieMovementTwoMovementPerAction: SquaddieMovement;
    let squaddieMovementThreeMovementPerAction: SquaddieMovement;
    let squaddieMovementHighMovementPerAction: SquaddieMovement;

    beforeEach(() => {
        ({
            squaddieMovementOneMovementPerAction,
            squaddieMovementTwoMovementPerAction,
            squaddieMovementThreeMovementPerAction,
            squaddieMovementHighMovementPerAction
        } = createSquaddieMovements());
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

        const origin: HexCoordinate = new HexCoordinate({q: 1, r: 1});
        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementOneMovementPerAction,
            numberOfActions: 1,
            startLocation: origin
        })));

        validateTilesAreFound(
            searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
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
                missionMap: missionMap,
                squaddieMovement: squaddieMovementOneMovementPerAction,
                numberOfActions: 1,
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
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            numberOfActions: 1,
            minimumDistanceMoved: 2,
            startLocation: new HexCoordinate({q: 0, r: 0}),
        })));

        validateTilesAreFound(
            searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
            [
                new HexCoordinate({q: 0, r: 2,}),
                new HexCoordinate({q: 0, r: 3,}),
            ],
            [
                new HexCoordinate({q: 0, r: 0,}),
                new HexCoordinate({q: 0, r: 1,}),
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
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            numberOfActions: 1,
            maximumDistanceMoved: 2,
            startLocation: new HexCoordinate({q: 0, r: 0}),
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
    });

    it('factors movement costs for rough terrain', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 2 1 "
        ])

        const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementTwoMovementPerAction,
            numberOfActions: 1,
            startLocation: new HexCoordinate({q: 0, r: 1}),
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
                new HexCoordinate({q: 0, r: 4,}),
            ]
        );
    });

    describe('wall movement', () => {
        let mapOneRowWithAWallBlockingTheEnd: string[];
        let wallTile: TileFoundDescription[];

        beforeEach(() => {
            mapOneRowWithAWallBlockingTheEnd = [
                "1 1 x 1 "
            ];

            wallTile = [
                new TileFoundDescription({hexCoordinate: new HexCoordinate({q: 0, r: 2}), movementCost: 0}),
            ];
        });

        it('will not search walls if movement cannot pass through walls', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementTwoMovementPerAction,
                numberOfActions: 1,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            })));

            validateTilesAreFound(
                searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 1,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 2,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ]
            );
        });

        it('will search through walls if movement can pass through walls', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAWallBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: new SquaddieMovement({
                    movementPerAction: 3,
                    traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                }),
                numberOfActions: 1,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            })));

            validateTilesAreFound(
                searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 1,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ],
                wallTile.map(tile => tile.hexCoordinate)
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
                missionMap: missionMap,
                squaddieMovement: squaddieMovementThreeMovementPerAction,
                numberOfActions: 1,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            })));

            validateTilesAreFound(
                searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 1,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 2,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ]
            );
        });

        it('can cross pits', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: new SquaddieMovement({
                    movementPerAction: 3,
                    traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                }),
                numberOfActions: 1,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            })));

            validateTilesAreFound(
                searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 1,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 2,}),
                ]
            );
        });

        it('will not cross pits if movement is limited', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder(mapOneRowWithAPitBlockingTheEnd);

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                }),
                numberOfActions: 1,
                startLocation: new HexCoordinate({q: 0, r: 0}),
            })));

            validateTilesAreFound(
                searchResults.allReachableTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 1,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 2,}),
                    new HexCoordinate({q: 0, r: 3,}),
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
                new HexCoordinate({q: 1, r: 1})
            ];

            tilesNotFoundBecauseSearchBlockedByWall = [
                new HexCoordinate({q: 1, r: 3}),
                new HexCoordinate({q: 1, r: 4}),
            ];

            tilesWithin2HexesOfOrigin = [
                moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
                moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
                moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),

                new HexCoordinate({q: 0, r: 0}),
                new HexCoordinate({q: 2, r: 2}),
                new HexCoordinate({q: 3, r: 0}),
            ];
        });

        it('returns nothing if no start location is provided', () => {
            const noTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 1,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                0,
                justTheCenter
            );

            expect(noTiles).toHaveLength(0);
        });

        it('can only includes itself with radius 0', () => {
            const centerTileOnly: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 1,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    startLocation: NewHexCoordinateFromNumberPair([0, 0]),
                }),
                0,
                justTheCenter,
            );
            validateTilesAreFound(
                centerTileOnly.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 1, r: 1,}),
                ],
                [
                    new HexCoordinate({q: 2, r: 1,}),
                    new HexCoordinate({q: 1, r: 2,}),
                ]
            );
        });

        it('Radius 1 should get all within 1 movement', () => {
            const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 1,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    startLocation: NewHexCoordinateFromNumberPair([0, 0]),
                }),
                1,
                justTheCenter,
            );
            validateTilesAreFound(
                centerAndAdjacentTiles.map(tile => tile.hexCoordinate),
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
            const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 1,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    startLocation: NewHexCoordinateFromNumberPair([0, 0]),
                }),
                2,
                justTheCenter,
            );
            validateTilesAreFound(
                centerAndAdjacentTiles.map(tile => tile.hexCoordinate),
                tilesWithin2HexesOfOrigin,
                tilesNotFoundBecauseSearchBlockedByWall
            );
        });

        it('can spread from multiple tiles', () => {
            const movementRangeTiles: TileFoundDescription[] = [
                ...justTheCenter.map((hex) => {
                    return new TileFoundDescription({
                        hexCoordinate: new HexCoordinate({q: hex.q, r: hex.r}),
                        movementCost: 0
                    })
                }),
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 1, r: 2}),
                    movementCost: 0
                }),
            ];

            const meleeAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 1,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                }),
                1,
                movementRangeTiles.map(tile => tile.hexCoordinate),
            );
            validateTilesAreFound(
                meleeAttackTiles.map(tile => tile.hexCoordinate),
                [
                    moveOneTileInDirection(movementRangeTiles[0].hexCoordinate, HexDirection.ORIGIN),
                    moveOneTileInDirection(movementRangeTiles[0].hexCoordinate, HexDirection.RIGHT),
                    moveOneTileInDirection(movementRangeTiles[0].hexCoordinate, HexDirection.LEFT),
                    moveOneTileInDirection(movementRangeTiles[0].hexCoordinate, HexDirection.UP_LEFT),
                    moveOneTileInDirection(movementRangeTiles[0].hexCoordinate, HexDirection.DOWN_RIGHT),

                    moveOneTileInDirection(movementRangeTiles[1].hexCoordinate, HexDirection.DOWN_RIGHT),
                ],
                tilesNotFoundBecauseSearchBlockedByWall
            );
        });
    });

    describe('spread with minimum range', () => {
        let pathfinder: Pathfinder;
        let justTheCenter: TileFoundDescription[];
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
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 1, r: 1}),
                    movementCost: 0
                }),
            ];
        });

        it('single tile', () => {
            const movementRangeTiles: TileFoundDescription[] = [
                ...justTheCenter,
            ];

            const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    minimumDistanceMoved: 2,
                    startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                }),
                3,
                movementRangeTiles.map(tile => tile.hexCoordinate),
            );

            validateTilesAreFound(
                indirectAttackTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 3,}),
                    new HexCoordinate({q: 1, r: 3,}),
                    new HexCoordinate({q: 3, r: 0,}),
                    new HexCoordinate({q: 4, r: 0,}),
                ],
                [
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.ORIGIN),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.LEFT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.RIGHT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.UP_LEFT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.UP_RIGHT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.DOWN_RIGHT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.DOWN_LEFT),

                    new HexCoordinate({q: 1, r: 5,}),

                    new HexCoordinate({q: 5, r: 0,}),
                ]
            );
        });

        it('multiple tiles are combined', () => {
            const movementRangeTiles: TileFoundDescription[] = [
                ...justTheCenter.map((hex) => {
                    return new TileFoundDescription({
                        hexCoordinate: new HexCoordinate({q: hex.q, r: hex.r}),
                        movementCost: 0
                    })
                }),
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 1, r: 2}),
                    movementCost: 0
                }),
            ];

            const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    minimumDistanceMoved: 2,
                    startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                }),
                3,
                movementRangeTiles.map(tile => tile.hexCoordinate),
            );
            validateTilesAreFound(
                indirectAttackTiles.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 3,}),
                    new HexCoordinate({q: 1, r: 3,}),
                    new HexCoordinate({q: 2, r: 0,}),
                    new HexCoordinate({q: 3, r: 0,}),
                    new HexCoordinate({q: 4, r: 0,}),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.LEFT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.UP_LEFT),
                ],
                [
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.ORIGIN),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.RIGHT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.UP_RIGHT),
                    moveOneTileInDirection(justTheCenter[0].hexCoordinate, HexDirection.DOWN_RIGHT),

                    new HexCoordinate({q: 1, r: 5,}),
                    new HexCoordinate({q: 5, r: 0,}),
                ]
            );
        });
    });

    describe('spread within range with walls', () => {
        let pathfinder: Pathfinder;
        let justTheCenter: TileFoundDescription[];
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
                new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({q: 0, r: 0}),
                    movementCost: 0
                })
            ];
        });

        it('can be blocked by walls', () => {
            const blockedByWall: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                }),
                2,
                justTheCenter.map(tile => tile.hexCoordinate),
            );
            validateTilesAreFound(
                blockedByWall.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 1,}),
                    new HexCoordinate({q: 0, r: 2,}),
                ]
            );
        });

        it('can target through walls', () => {
            const skipPastWalls: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 3,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    startLocation: NewHexCoordinateFromNumberPair([justTheCenter[0].q, justTheCenter[0].r]),
                }),
                2,
                justTheCenter.map(tile => tile.hexCoordinate),
            );
            validateTilesAreFound(
                skipPastWalls.map(tile => tile.hexCoordinate),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 2,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 1,}),
                ]
            );
        });
    });
});
