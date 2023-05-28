import {HexCoordinate} from "../hexGrid";
import {Pathfinder} from "./pathfinder";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {createMapAndPathfinder, createSquaddieMovements, validateTilesAreFound} from "./pathfinder_test_utils";

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
            "1 2 1 1 "
        ])

        const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
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

    it('can factor a maximum distance to movement', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 2 2 1 "
        ])

        const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            numberOfActions: 1,
            maximumDistanceMoved: 2,
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
});
