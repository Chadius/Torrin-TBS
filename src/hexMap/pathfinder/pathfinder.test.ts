import {TerrainTileMap} from "../terrainTileMap";
import {HexCoordinate} from "../hexGrid";
import {NewDummySquaddieID, SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource, SquaddieResource} from "../../squaddie/resource";
import {Pathfinder} from "./pathfinder";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams, SearchParamsOptions} from "./searchParams";
import {NullTraitStatusStorage, Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError, isError, ResultOrError, unwrapResultOrError} from "../../utils/ResultOrError";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";

describe('pathfinder', () => {
    let squaddieMovementOneMovementPerAction: SquaddieMovement;
    let squaddieMovementTwoMovementPerAction: SquaddieMovement;
    let squaddieMovementThreeMovementPerAction: SquaddieMovement;
    let squaddieMovementHighMovementPerAction: SquaddieMovement;

    beforeEach(() => {
        squaddieMovementOneMovementPerAction = new SquaddieMovement({
            movementPerAction: 1,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        });

        squaddieMovementTwoMovementPerAction = new SquaddieMovement({
            movementPerAction: 2,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        });

        squaddieMovementThreeMovementPerAction = new SquaddieMovement({
            movementPerAction: 3,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        });

        squaddieMovementHighMovementPerAction = new SquaddieMovement({
            movementPerAction: 10,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        });
    });

    const createMapAndPathfinder = (movementCost: string[]) => {
        const terrainTileMap: TerrainTileMap = new TerrainTileMap({movementCost});
        const missionMap: MissionMap = new MissionMap({terrainTileMap})
        const pathfinder: Pathfinder = new Pathfinder();
        return {
            missionMap,
            pathfinder,
        }
    }

    const validateTilesAreFound = (tilesToTest: HexCoordinate[], tilesFound: HexCoordinate[], tilesNotFound: HexCoordinate[]) => {
        const tilesByKey: { [key: string]: boolean } = {};
        tilesFound.forEach((tile) => {
            const key = `${tile.q},${tile.r}`;
            if (tilesByKey[key]) {
                throw new Error(`Tiles Found has repeating tile (${tile.q}, ${tile.r})`)
            }
            tilesByKey[key] = true;
        });
        tilesNotFound.forEach((tile) => {
            const key = `${tile.q},${tile.r}`;
            if (tilesByKey[key]) {
                throw new Error(`Tiles Not Found has repeating tile (${tile.q}, ${tile.r})`)
            }
            tilesByKey[key] = true;
        });

        const sortTiles = (a: TileFoundDescription, b: TileFoundDescription) => {
            if (a.q < b.q) {
                return -1;
            } else if (a.q > b.q) {
                return 1;
            }

            if (a.r < a.r) {
                return -1;
            } else if (a.r > b.r) {
                return 1;
            }

            return 0;
        }

        tilesToTest.sort(sortTiles);

        expect(tilesToTest).toHaveLength(tilesFound.length);
        tilesFound.forEach((tile) => {
            try {
                expect(tilesToTest.some((tileDesc) => tileDesc.q === tile.q && tileDesc.r === tile.r)).toBeTruthy();
            } catch (e) {
                throw new Error(`Cannot find tile (${tile.q}, ${tile.r})`)
            }
        });
        tilesNotFound.forEach((tile) => {
            try {
                expect(tilesToTest.some((tileDesc) => tileDesc.q === tile.q && tileDesc.r === tile.r)).toBeFalsy();
            } catch (e) {
                throw new Error(`Should not have found tile (${tile.q}, ${tile.r})`)
            }
        });
    };

    const validateTileHasExpectedNumberOfActions = (q: number, r: number, expectedActions: number, searchResults: SearchResults) => {
        const searchPath: SearchPath = searchResults.getLowestCostRoute(q, r);
        expect(searchPath).not.toBeUndefined();
        const tilesFoundByNumberOfActions: TileFoundDescription[][] = searchPath.getTilesTraveledByNumberOfMovementActions();
        expect(tilesFoundByNumberOfActions[expectedActions]).not.toBeUndefined();
        const tileAtCoordinate = tilesFoundByNumberOfActions[expectedActions].find((t) => t.q === q && t.r === r);
        expect(tileAtCoordinate).not.toBeUndefined();
    }

    describe('pathfinding with a single move', () => {
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
            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementOneMovementPerAction,
                numberOfActions: 1,
                startLocation: origin
            }));

            validateTilesAreFound(
                searchResults.allReachableTiles,
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

        it('can factor a minimum distance to movement', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder([
                "1 1 1 1 "
            ])

            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementThreeMovementPerAction,
                numberOfActions: 1,
                minimumDistanceMoved: 2,
                startLocation: {q: 0, r: 0}
            }));

            validateTilesAreFound(
                searchResults.allReachableTiles,
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

        it('factors movement costs for rough terrain', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder([
                "1 1 1 2 1 "
            ])

            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementTwoMovementPerAction,
                numberOfActions: 1,
                startLocation: {q: 0, r: 1}
            }));

            validateTilesAreFound(
                searchResults.allReachableTiles,
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
            let wallTile: TileFoundDescription[];

            beforeEach(() => {
                mapOneRowWithAWallBlockingTheEnd = [
                    "1 1 x 1 "
                ];

                wallTile = [
                    {q: 0, r: 2, movementCost: 0},
                ];
            });

            it('will not search walls if movement cannot pass through walls', () => {
                const {
                    missionMap,
                    pathfinder,
                } = createMapAndPathfinder(mapOneRowWithAWallBlockingTheEnd);

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: squaddieMovementTwoMovementPerAction,
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                }));

                validateTilesAreFound(
                    searchResults.allReachableTiles,
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

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 3,
                        traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                }));

                validateTilesAreFound(
                    searchResults.allReachableTiles,
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

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: squaddieMovementThreeMovementPerAction,
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                }));

                validateTilesAreFound(
                    searchResults.allReachableTiles,
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

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 3,
                        traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                }));

                validateTilesAreFound(
                    searchResults.allReachableTiles,
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

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    missionMap: missionMap,
                    squaddieMovement: new SquaddieMovement({
                        movementPerAction: 2,
                        traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                }));

                validateTilesAreFound(
                    searchResults.allReachableTiles,
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

        describe('squaddie affiliations can allow pass through', () => {
            let missionMap: MissionMap;
            let pathfinder: Pathfinder;
            let baseSearchParamOptions: SearchParamsOptions;

            beforeEach(() => {
                const {
                    missionMap: tempMissionMap,
                    pathfinder: tempPathfinder,
                } = createMapAndPathfinder([
                    "1 1 1 1 1 ",
                ]);

                missionMap = tempMissionMap;
                pathfinder = tempPathfinder;

                baseSearchParamOptions = {
                    missionMap: missionMap,
                    squaddieMovement: squaddieMovementThreeMovementPerAction,
                    numberOfActions: 1,
                    startLocation: {q: 0, r: 0}
                };
            });

            const validateCanPassThroughFriendly = (searchResults: SearchResults) => {
                validateTilesAreFound(
                    searchResults.allReachableTiles,
                    [
                        {q: 0, r: 0,},
                        {q: 0, r: 2,},
                        {q: 0, r: 3,},
                    ],
                    [
                        {q: 0, r: 1,},
                    ]
                );
            }

            const validateCannotPassThroughUnfriendly = (searchResults: SearchResults) => {
                validateTilesAreFound(
                    searchResults.allReachableTiles,
                    [
                        {q: 0, r: 0,},
                    ],
                    [
                        {q: 0, r: 1,},
                        {q: 0, r: 2,},
                        {q: 0, r: 3,},
                    ]
                );
            }

            const validateAffiliatePassingStatus = (
                pathfindingAffiliation: SquaddieAffiliation,
                blockingAffiliation: SquaddieAffiliation,
                canPassThrough: boolean
            ) => {
                const blockingSquaddie = new SquaddieId({
                    name: "blocker",
                    id: "blocker",
                    resources: new SquaddieResource({mapIconResourceKey: "map_icon_blocker"}),
                    traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
                    affiliation: blockingAffiliation,
                });
                missionMap.addSquaddie(blockingSquaddie, {q: 0, r: 1});

                const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                    ...baseSearchParamOptions,
                    squaddieAffiliation: pathfindingAffiliation,
                }));
                if (canPassThrough) {
                    validateCanPassThroughFriendly(searchResults);
                    return;
                }
                validateCannotPassThroughUnfriendly(searchResults);
            }

            it('player can pass through another player', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.PLAYER,
                    SquaddieAffiliation.PLAYER,
                    true,
                );
            });

            it('player can pass through an ally', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.PLAYER,
                    SquaddieAffiliation.ALLY,
                    true,
                );
            });

            it('player cannot pass through enemy', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.PLAYER,
                    SquaddieAffiliation.ENEMY,
                    false,
                );
            });

            it('player cannot pass through no affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.PLAYER,
                    SquaddieAffiliation.NONE,
                    false,
                );
            });

            it('enemy cannot pass through player', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ENEMY,
                    SquaddieAffiliation.PLAYER,
                    false,
                );
            });

            it('enemy cannot pass through an ally', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ENEMY,
                    SquaddieAffiliation.ALLY,
                    false,
                );
            });

            it('enemy can pass through enemy', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ENEMY,
                    SquaddieAffiliation.ENEMY,
                    true,
                );
            });

            it('enemy cannot pass through no affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ENEMY,
                    SquaddieAffiliation.NONE,
                    false,
                );
            });

            it('ally can pass through another player', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ALLY,
                    SquaddieAffiliation.PLAYER,
                    true,
                );
            });

            it('ally can pass through another ally', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ALLY,
                    SquaddieAffiliation.ALLY,
                    true,
                );
            });

            it('ally cannot pass through enemy', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ALLY,
                    SquaddieAffiliation.ENEMY,
                    false,
                );
            });

            it('ally cannot pass through no affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.ALLY,
                    SquaddieAffiliation.NONE,
                    false,
                );
            });

            it('cannot pass through player without an affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.NONE,
                    SquaddieAffiliation.PLAYER,
                    false,
                );
            });

            it('cannot pass through enemy without an affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.NONE,
                    SquaddieAffiliation.ENEMY,
                    false,
                );
            });

            it('cannot pass through ally without an affiliation', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.NONE,
                    SquaddieAffiliation.ENEMY,
                    false,
                );
            });

            it('squaddies with no affiliation cannot pass through each other', () => {
                validateAffiliatePassingStatus(
                    SquaddieAffiliation.NONE,
                    SquaddieAffiliation.NONE,
                    false,
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

            it('can only includes itself with radius 0', () => {
                const centerTileOnly: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 1,
                            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                        })
                    }),
                    0,
                    justTheCenter.map((hex) => {
                        return {q: hex.q, r: hex.r, numberOfActions: 0, movementCost: 0}
                    }),
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
                const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 1,
                            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                        }),
                    }),
                    1,
                    justTheCenter.map((hex) => {
                        return {q: hex.q, r: hex.r, numberOfActions: 0, movementCost: 0}
                    }),
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
                const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 1,
                            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                        }),
                    }),
                    2,
                    justTheCenter.map((hex) => {
                        return {q: hex.q, r: hex.r, numberOfActions: 0, movementCost: 0}
                    })
                );
                validateTilesAreFound(
                    centerAndAdjacentTiles,
                    tilesWithin2HexesOfOrigin,
                    tilesNotFoundBecauseSearchBlockedByWall
                );
            });

            it('can spread from multiple tiles', () => {
                const movementRangeTiles: TileFoundDescription[] = [
                    ...justTheCenter.map((hex) => {
                        return {q: hex.q, r: hex.r, numberOfActions: 0, movementCost: 0}
                    }),
                    {q: 1, r: 2, numberOfActions: 0, movementCost: 0}
                ];

                const meleeAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 1,
                            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                        }),
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
                    {q: 1, r: 1, movementCost: 0}
                ];
            });

            it('single tile', () => {
                const movementRangeTiles: TileFoundDescription[] = [
                    ...justTheCenter,
                ];

                const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        minimumDistanceMoved: 2,
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
                const movementRangeTiles: TileFoundDescription[] = [
                    ...justTheCenter.map((hex) => {
                        return {q: hex.q, r: hex.r, numberOfActions: 0, movementCost: 0}
                    }),
                    {q: 1, r: 2, numberOfActions: 0, movementCost: 0}
                ];

                const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        minimumDistanceMoved: 2,
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
                    {q: 0, r: 0, movementCost: 0}
                ];
            });

            it('can be blocked by walls', () => {
                const blockedByWall: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
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
                const skipPastWalls: TileFoundDescription[] = pathfinder.getTilesInRange(new SearchParams({
                        missionMap: missionMap,
                        squaddieMovement: new SquaddieMovement({
                            movementPerAction: 3,
                            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
                        }),
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

        it('should stop on squaddies if allowed', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder([
                "1 1 1 1 1 1 ",
            ]);

            missionMap.addSquaddie(
                NewDummySquaddieID("player", SquaddieAffiliation.PLAYER),
                {q: 0, r: 0}
            );
            missionMap.addSquaddie(
                NewDummySquaddieID("enemy", SquaddieAffiliation.ENEMY),
                {q: 0, r: 1}
            );
            missionMap.addSquaddie(
                NewDummySquaddieID("ally", SquaddieAffiliation.ALLY),
                {q: 0, r: 2}
            );
            missionMap.addSquaddie(
                NewDummySquaddieID("none", SquaddieAffiliation.NONE),
                {q: 0, r: 3}
            );

            const allTilesOnMap: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                canStopOnSquaddies: true,
                minimumDistanceMoved: 0,
                missionMap,
                numberOfActions: 1,
                squaddieMovement: new SquaddieMovement({
                    movementPerAction: 10,
                    traits: NullTraitStatusStorage(),
                }),
                startLocation: {q: 0, r: 0},
                stopLocation: undefined
            }))

            validateTilesAreFound(
                allTilesOnMap.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                    {q: 0, r: 4,},
                    {q: 0, r: 5,},
                ],
                []
            );
        });
    });

    describe('move with multiple movement actions', () => {
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

            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementOneMovementPerAction,
                numberOfActions: 2,
                startLocation: {q: 0, r: 0}
            }));
            validateTilesAreFound(
                searchResults.allReachableTiles,
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                    {q: 0, r: 2,},
                ],
                [
                    {q: 0, r: 3,},
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

            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementTwoMovementPerAction,
                numberOfActions: 2,
                startLocation: {q: 0, r: 0}
            }));
            validateTilesAreFound(
                searchResults.allReachableTiles,
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 1,},
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ],
                []
            );

            validateTileHasExpectedNumberOfActions(0, 0, 0, searchResults)
            validateTileHasExpectedNumberOfActions(0, 1, 1, searchResults)
            validateTileHasExpectedNumberOfActions(0, 2, 1, searchResults)
            validateTileHasExpectedNumberOfActions(0, 3, 2, searchResults)
        });
    });

    describe('reaching a destination', () => {
        let smallMap: string[];

        beforeEach(() => {
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 1}
            }));

            let routeFound: SearchPath;
            let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
            routeFound = getResultOrThrowError(routeOrError);

            expect(routeFound.getTotalCost()).toEqual(1);
            expect(routeFound.getDestination()).toStrictEqual({
                q: 0,
                r: 1,
            });
            expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
                q: 0,
                r: 1,
                movementCost: 1,
            });
            expect(routeFound.getTilesTraveled()).toStrictEqual([
                {
                    q: 0,
                    r: 0,
                    movementCost: 0,
                },
                {
                    q: 0,
                    r: 1,
                    movementCost: 1,
                }
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
                startLocation: {q: 0, r: 0},
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

            const allTiles = pathfinder.getAllReachableTiles(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementOneMovementPerAction,
                numberOfActions: 1,
                startLocation: {q: 0, r: 0},
            }));

            let somePathOrError;
            if (
                allTiles instanceof SearchResults
            ) {
                somePathOrError = allTiles.getRouteToStopLocation();
            }

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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 9000, r: 2}
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 0}
            }));

            let routeFound: SearchPath;
            let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
            routeFound = getResultOrThrowError(routeOrError);

            expect(routeFound.getTotalCost()).toEqual(0);
            expect(routeFound.getDestination()).toStrictEqual({
                q: 0,
                r: 0,
            });
            expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
                q: 0,
                r: 0,
                movementCost: 0,
            });
            expect(routeFound.getTilesTraveled()).toStrictEqual([
                {
                    q: 0,
                    r: 0,
                    movementCost: 0,
                },
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 2, r: 2}
            }));

            let routeFound: SearchPath;
            let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
            routeFound = getResultOrThrowError(routeOrError);

            expect(routeFound.getTotalCost()).toEqual(4);
            expect(routeFound.getDestination()).toStrictEqual({
                q: 2,
                r: 2,
            });
            expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
                q: 2,
                r: 2,
                movementCost: 4,
            });

            expect(routeFound.getTilesTraveled()).toStrictEqual([
                {
                    q: 0,
                    r: 0,
                    movementCost: 0,
                },
                {
                    q: 1,
                    r: 0,
                    movementCost: 1,
                },
                {
                    q: 2,
                    r: 0,
                    movementCost: 2,
                },
                {
                    q: 2,
                    r: 1,
                    movementCost: 3,
                },
                {
                    q: 2,
                    r: 2,
                    movementCost: 4,
                },
            ]);

            expect(routeFound.getTilesTraveledByNumberOfMovementActions()).toStrictEqual([
                [
                    {
                        q: 0,
                        r: 0,
                        movementCost: 0,
                    },
                ],
                [
                    {
                        q: 1,
                        r: 0,
                        movementCost: 1,
                    },
                    {
                        q: 2,
                        r: 0,
                        movementCost: 2,
                    },
                ],
                [
                    {
                        q: 2,
                        r: 1,
                        movementCost: 3,
                    },
                    {
                        q: 2,
                        r: 2,
                        movementCost: 4,
                    },
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 4}
            }));

            let routeFound: SearchPath;
            let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
            routeFound = getResultOrThrowError(routeOrError);

            expect(routeFound.getTotalCost()).toEqual(5);
            expect(routeFound.getTilesTraveled()).toStrictEqual([
                {
                    q: 0,
                    r: 0,
                    movementCost: 0,
                },
                {
                    q: 1,
                    r: 0,
                    movementCost: 1,
                },
                {
                    q: 1,
                    r: 1,
                    movementCost: 2,
                },
                {
                    q: 1,
                    r: 2,
                    movementCost: 3,
                },
                {
                    q: 1,
                    r: 3,
                    movementCost: 4,
                },
                {
                    q: 0,
                    r: 4,
                    movementCost: 5,
                },
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 4}
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
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 4}
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
                coordinate: {q: 0, r: 2},
                distance: 2,
            }));
            expect(closestTilesToDestination[1]).toEqual(expect.objectContaining({
                coordinate: {q: 0, r: 1},
                distance: 3,
            }));
            expect(closestTilesToDestination[2]).toEqual(expect.objectContaining({
                coordinate: {q: 0, r: 0},
                distance: 4,
            }));
        });

        it('will move around unfriendly squaddies', () => {
            const {
                missionMap,
                pathfinder,
            } = createMapAndPathfinder([
                "1 1 1 1 1 ",
                " 1 1 1 1 1 ",
            ]);

            missionMap.addSquaddie(
                new SquaddieId({
                    name: "enemy",
                    id: "enemy",
                    resources: NullSquaddieResource(),
                    traits: NullTraitStatusStorage(),
                    affiliation: SquaddieAffiliation.ENEMY
                }),
                {q: 0, r: 1}
            )

            const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementHighMovementPerAction,
                startLocation: {q: 0, r: 0},
                stopLocation: {q: 0, r: 2},
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            }));

            let routeFound: SearchPath;
            let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
            routeFound = getResultOrThrowError(routeOrError);
            const tilesTraveled: TileFoundDescription[] = routeFound.getTilesTraveled()
            expect(tilesTraveled).toHaveLength(4);
            expect(tilesTraveled[0]).toEqual(expect.objectContaining({
                q: 0,
                r: 0,
                movementCost: 0,
            }));
            expect(tilesTraveled[0]).toEqual(expect.objectContaining({
                q: 0,
                r: 0,
                movementCost: 0,
            }));
            expect(tilesTraveled[1]).toEqual(expect.objectContaining({
                q: 1,
                r: 0,
                movementCost: 1,
            }));
            expect(tilesTraveled[2]).toEqual(expect.objectContaining({
                q: 1,
                r: 1,
                movementCost: 2,
            }));
            expect(tilesTraveled[3]).toEqual(expect.objectContaining({
                q: 0,
                r: 2,
                movementCost: 3,
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
                startLocation: {q: 1, r: 1},
                stopLocation: {q: 2, r: 2}
            })));

            let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());
            expect(routeSortedByNumberOfMovementActions).toStrictEqual([
                [
                    {
                        q: 1,
                        r: 1,
                        movementCost: 0,
                    },
                ],
                [
                    {
                        q: 2,
                        r: 1,
                        movementCost: 1,
                    }
                ],
                [
                    {
                        q: 2,
                        r: 2,
                        movementCost: 2,
                    }
                ]
            ])
        });
    });
});
