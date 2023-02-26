import {TerrainTileMap} from "../terrainTileMap";
import {HexCoordinate, HexGridTile, Integer} from "../hexGrid";
import {SquaddieID} from "../../squaddie/id";
import {SquaddieResource} from "../../squaddie/resource";
import {
  Pathfinder
} from "./pathfinder";
import {HexGridMovementCost} from "../hexGridMovementCost";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";

describe('pathfinder', () => {
  let map: TerrainTileMap;
  let torrinSquaddie: SquaddieID;
  beforeEach(() => {
    map = new TerrainTileMap({
      tiles: [
        new HexGridTile(0 as Integer, -1 as Integer, HexGridMovementCost.singleMovement),
        new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.singleMovement),
        new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.doubleMovement),
      ]
    });

    torrinSquaddie = new SquaddieID({
      name: "Torrin",
      id: "000",
      resources: new SquaddieResource({
        mapIconResourceKey: "map_icon_torrin"
      }),
      traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
    });
  });

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
    const searchPath: SearchPath = searchResults.getLowestCostRoute(q as Integer, r as Integer);
    expect(searchPath).not.toBeUndefined();
    const tilesFoundByNumberOfActions: TileFoundDescription[][] = searchPath.getTilesTraveledByNumberOfMovementActions();
    expect(tilesFoundByNumberOfActions[expectedActions]).not.toBeUndefined();
    const tileAtCoordinate = tilesFoundByNumberOfActions[expectedActions].find((t) => t.q === q as Integer && t.r === r as Integer);
    expect(tileAtCoordinate).not.toBeUndefined();
  }

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

  describe('pathfinding with a single move', () => {
    it('shows all of the tiles that can be reached from a single move', () => {
      map = new TerrainTileMap({
        movementCost: [
          "  1 1 1 ",
          " 1 1 1 1 ",
          "  1 1 1 ",
        ]
      });
      const missionMap = new MissionMap({
        terrainTileMap: map
      })
      const pathfinder = new Pathfinder();

      const origin: HexCoordinate = {q: 1 as Integer, r: 1 as Integer};
      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: origin
      })).allReachableTiles;

      validateTilesAreFound(
        allMovableTiles,
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
      const lineMap = new TerrainTileMap({
        movementCost: [
          "1 1 1 1 "
        ]
      });
      const missionMap = new MissionMap({
        terrainTileMap: lineMap
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 3,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        minimumDistanceMoved: 2,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 2 as Integer,},
          {q: 0 as Integer, r: 3 as Integer,},
        ],
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 1 as Integer,},
        ]
      );
    });

    it('factors movement costs for rough terrain', () => {
      map = new TerrainTileMap({
        movementCost: [
          "1 1 1 2 1 "
        ]
      });
      const missionMap = new MissionMap({
        terrainTileMap: map
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 2,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 1 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 1 as Integer,},
          {q: 0 as Integer, r: 2 as Integer,},
        ],
        [
          {q: 0 as Integer, r: 3 as Integer,},
          {q: 0 as Integer, r: 4 as Integer,},
        ]
      );
    });

    describe('wall movement', () => {
      let map: TerrainTileMap;
      let wallTile: TileFoundDescription[];

      beforeEach(() => {
        map = new TerrainTileMap({
          movementCost: [
            "1 1 x 1 "
          ]
        });

        wallTile = [
          {q: 0 as Integer, r: 2 as Integer, movementCost: 0},
        ];
      });

      it('will not search walls if movement cannot pass through walls', () => {
        const missionMap = new MissionMap({
          terrainTileMap: map
        })
        const pathfinder = new Pathfinder();

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          missionMap: missionMap,
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 2,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles.allReachableTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 1 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 2 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
          ]
        );
      });

      it('will search through walls if movement can pass through walls', () => {
        const missionMap = new MissionMap({
          terrainTileMap: map
        })
        const pathfinder = new Pathfinder();

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          missionMap: missionMap,
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            traits: new TraitStatusStorage({[Trait.PASS_THROUGH_WALLS]: true,}).filterCategory(TraitCategory.MOVEMENT)
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles.allReachableTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 1 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
          ],
          wallTile
        );
      });
    });

    describe('crossing pits', () => {
      let map: TerrainTileMap;
      let pathfinder: Pathfinder;
      let missionMap: MissionMap;
      beforeEach(() => {
        map = new TerrainTileMap({
          movementCost: [
            "1 1 - 1 "
          ]
        });
        missionMap = new MissionMap({
          terrainTileMap: map
        })
        pathfinder = new Pathfinder();
      });

      it('will not cross pits if specified', () => {
        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          missionMap: missionMap,
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles.allReachableTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 1 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 2 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
          ]
        );
      });

      it('can cross pits', () => {
        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          missionMap: missionMap,
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles.allReachableTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 1 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 2 as Integer,},
          ]
        );
      });

      it('will not cross pits if movement is limited', () => {
        const missionMap = new MissionMap({
          terrainTileMap: map
        })
        const pathfinder = new Pathfinder();

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          missionMap: missionMap,
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 2,
            traits: new TraitStatusStorage({[Trait.CROSS_OVER_PITS]: true,}).filterCategory(TraitCategory.MOVEMENT)
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles.allReachableTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 1 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 2 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
          ]
        );
      });
    });

    it('cannot stop on an already occupied tile', () => {
      const map = new TerrainTileMap({
        movementCost: [
          "1 1 1 "
        ]
      });

      const missionMap = new MissionMap({
        terrainTileMap: map
      })
      const pathfinder = new Pathfinder();

      const teammate = new SquaddieID({
        name: "teammate",
        id: "teammate",
        resources: new SquaddieResource({
          mapIconResourceKey: "map_icon_teammate"
        }),
        traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
      });

      missionMap.addSquaddie(teammate, {q: 0 as Integer, r: 1 as Integer});

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 3,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 2 as Integer,},
        ],
        [
          {q: 0 as Integer, r: 1 as Integer,},
        ]
      );
    });

    describe('tiles within range of single tile', () => {
      let map: TerrainTileMap;
      let pathfinder: Pathfinder;
      let justTheCenter: HexCoordinate[];
      let tilesNotFoundBecauseSearchBlockedByWall: HexCoordinate[];
      let tilesWithin2HexesOfOrigin: HexCoordinate[];
      let missionMap: MissionMap;

      beforeEach(() => {
        map = new TerrainTileMap({
          movementCost: [
            '1 1 ',
            ' 1 1 1 x 1 ',
            '  x 1 1 ',
            '   1 ',
          ]
        });

        missionMap = new MissionMap({
          terrainTileMap: map
        })
        pathfinder = new Pathfinder();

        justTheCenter = [
          {q: 1 as Integer, r: 1 as Integer}
        ];

        tilesNotFoundBecauseSearchBlockedByWall = [
          {q: 1 as Integer, r: 3 as Integer},
          {q: 1 as Integer, r: 4 as Integer},
        ];

        tilesWithin2HexesOfOrigin = [
          moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
          moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
          moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
          moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
          moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),

          {q: 0 as Integer, r: 0 as Integer},
          {q: 2 as Integer, r: 2 as Integer},
          {q: 3 as Integer, r: 0 as Integer},
        ];
      });

      it('can only includes itself with radius 0', () => {
        const centerTileOnly: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: justTheCenter.map((hex) => {
            return {q: hex.q, r: hex.r, numberOfActions: 0 as Integer, movementCost: 0}
          }),
          maximumDistance: 0,
          passThroughWalls: true,
        });
        validateTilesAreFound(
          centerTileOnly,
          [
            {q: 1 as Integer, r: 1 as Integer,},
          ],
          [
            {q: 2 as Integer, r: 1 as Integer,},
            {q: 1 as Integer, r: 2 as Integer,},
          ]
        );
      });

      it('Radius 1 should get all within 1 movement', () => {
        const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: justTheCenter.map((hex) => {
            return {q: hex.q, r: hex.r, numberOfActions: 0 as Integer, movementCost: 0}
          }),
          maximumDistance: 1,
          passThroughWalls: true,
        });
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
        const centerAndAdjacentTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: justTheCenter.map((hex) => {
            return {q: hex.q, r: hex.r, numberOfActions: 0 as Integer, movementCost: 0}
          }),
          maximumDistance: 2,
          passThroughWalls: true,
        });
        validateTilesAreFound(
          centerAndAdjacentTiles,
          tilesWithin2HexesOfOrigin,
          tilesNotFoundBecauseSearchBlockedByWall
        );
      });

      it('can spread from multiple tiles', () => {
        const movementRangeTiles: TileFoundDescription[] = [
          ...justTheCenter.map((hex) => {
            return {q: hex.q, r: hex.r, numberOfActions: 0 as Integer, movementCost: 0}
          }),
          {q: 1 as Integer, r: 2 as Integer, numberOfActions: 0 as Integer, movementCost: 0}
        ];

        const meleeAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: movementRangeTiles,
          maximumDistance: 1,
          passThroughWalls: true,
        });
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
      let bigMap: TerrainTileMap;
      let pathfinder: Pathfinder;
      let justTheCenter: TileFoundDescription[];
      let missionMap: MissionMap;

      beforeEach(() => {
        bigMap = new TerrainTileMap({
          movementCost: [
            '1 1 1 1 ',
            ' 1 1 1 1 x 1 ',
            '  1 1 ',
            '   1 ',
            '    1 ',
            '     1 ',
          ]
        });

        missionMap = new MissionMap({
          terrainTileMap: bigMap
        })
        pathfinder = new Pathfinder();

        justTheCenter = [
          {q: 1 as Integer, r: 1 as Integer, movementCost: 0}
        ];
      });

      it('single tile', () => {
        const movementRangeTiles: TileFoundDescription[] = [
          ...justTheCenter,
        ];

        const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: movementRangeTiles,
          minimumDistance: 2,
          maximumDistance: 3,
          passThroughWalls: false,
        });

        validateTilesAreFound(
          indirectAttackTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
            {q: 1 as Integer, r: 3 as Integer,},
            {q: 3 as Integer, r: 0 as Integer,},
            {q: 4 as Integer, r: 0 as Integer,},
          ],
          [
            moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
            moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.UP_RIGHT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_LEFT),

            {q: 1 as Integer, r: 5 as Integer,},

            {q: 5 as Integer, r: 0 as Integer,},
          ]
        );
      });

      it('multiple tiles are combined', () => {
        const movementRangeTiles: TileFoundDescription[] = [
          ...justTheCenter.map((hex) => {
            return {q: hex.q, r: hex.r, numberOfActions: 0 as Integer, movementCost: 0}
          }),
          {q: 1 as Integer, r: 2 as Integer, numberOfActions: 0 as Integer, movementCost: 0}
        ];

        const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: movementRangeTiles,
          minimumDistance: 2,
          maximumDistance: 3,
          passThroughWalls: false,
        });
        validateTilesAreFound(
          indirectAttackTiles,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 3 as Integer,},
            {q: 1 as Integer, r: 3 as Integer,},
            {q: 2 as Integer, r: 0 as Integer,},
            {q: 3 as Integer, r: 0 as Integer,},
            {q: 4 as Integer, r: 0 as Integer,},
            moveOneTileInDirection(justTheCenter[0], HexDirection.LEFT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.UP_LEFT),
          ],
          [
            moveOneTileInDirection(justTheCenter[0], HexDirection.ORIGIN),
            moveOneTileInDirection(justTheCenter[0], HexDirection.RIGHT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.UP_RIGHT),
            moveOneTileInDirection(justTheCenter[0], HexDirection.DOWN_RIGHT),

            {q: 1 as Integer, r: 5 as Integer,},
            {q: 5 as Integer, r: 0 as Integer,},
          ]
        );
      });
    });

    describe('spread within range with walls', () => {
      let map: TerrainTileMap;
      let pathfinder: Pathfinder;
      let justTheCenter: TileFoundDescription[];
      let missionMap: MissionMap;

      beforeEach(() => {
        map = new TerrainTileMap({
          tiles: [
            new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.singleMovement),
            new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.wall),
            new HexGridTile(0 as Integer, 2 as Integer, HexGridMovementCost.singleMovement),
          ]
        });

        missionMap = new MissionMap({
          terrainTileMap: map
        });
        pathfinder = new Pathfinder();

        justTheCenter = [
          {q: 0 as Integer, r: 0 as Integer, movementCost: 0}
        ];
      });

      it('can be blocked by walls', () => {
        const blockedByWall: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: justTheCenter,
          maximumDistance: 2,
          passThroughWalls: false,
        });
        validateTilesAreFound(
          blockedByWall,
          [
            {q: 0 as Integer, r: 0 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 1 as Integer,},
            {q: 0 as Integer, r: 2 as Integer,},
          ]
        );
      });

      it('can target through walls', () => {
        const skipPastWalls: TileFoundDescription[] = pathfinder.getTilesInRange({
          missionMap: missionMap,
          sourceTiles: justTheCenter,
          maximumDistance: 2,
          passThroughWalls: true,
        });
        validateTilesAreFound(
          skipPastWalls,
          [
            {q: 0 as Integer, r: 0 as Integer,},
            {q: 0 as Integer, r: 2 as Integer,},
          ],
          [
            {q: 0 as Integer, r: 1 as Integer,},
          ]
        );
      });
    });

    it('can use SquaddieMovement to find reachable tiles', () => {
      map = new TerrainTileMap({
        movementCost: [
          "1 1 1 2 1 "
        ]
      });

      const missionMap = new MissionMap({
        terrainTileMap: map
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 2,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 1 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 1 as Integer,},
          {q: 0 as Integer, r: 2 as Integer,},
        ],
        [
          {q: 0 as Integer, r: 3 as Integer,},
          {q: 0 as Integer, r: 4 as Integer,},
        ]
      );
    });

  });

  describe('move with multiple movement actions', () => {
    let map: TerrainTileMap;

    beforeEach(() => {
      map = new TerrainTileMap({
        movementCost: [
          "1 1 1 1 "
        ]
      });
    });

    it('can report on how many movement actions it took', () => {
      const missionMap = new MissionMap({
        terrainTileMap: map
      })
      const pathfinder = new Pathfinder();
      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 2,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));
      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 1 as Integer,},
          {q: 0 as Integer, r: 2 as Integer,},
        ],
        [
          {q: 0 as Integer, r: 3 as Integer,},
        ]
      );

      validateTileHasExpectedNumberOfActions(0, 0, 0, allMovableTiles)
      validateTileHasExpectedNumberOfActions(0, 1, 1, allMovableTiles)
      validateTileHasExpectedNumberOfActions(0, 2, 2, allMovableTiles)
    });

    it('discards excess movement between actions', () => {
      const missionMap = new MissionMap({
        terrainTileMap: new TerrainTileMap({
          movementCost: [
            "1 1 1 2 "
          ]
        })
      })
      const pathfinder = new Pathfinder();
      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 2,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 2,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));
      validateTilesAreFound(
        allMovableTiles.allReachableTiles,
        [
          {q: 0 as Integer, r: 0 as Integer,},
          {q: 0 as Integer, r: 1 as Integer,},
          {q: 0 as Integer, r: 2 as Integer,},
          {q: 0 as Integer, r: 3 as Integer,},
        ],
        []
      );

      validateTileHasExpectedNumberOfActions(0, 0, 0, allMovableTiles)
      validateTileHasExpectedNumberOfActions(0, 1, 1, allMovableTiles)
      validateTileHasExpectedNumberOfActions(0, 2, 1, allMovableTiles)
      validateTileHasExpectedNumberOfActions(0, 3, 2, allMovableTiles)
    });
  });

  describe('reaching a destination', () => {
    let smallMap: TerrainTileMap;

    beforeEach(() => {
      smallMap = new TerrainTileMap({
        movementCost: [
          "1 1 "
        ]
      });
    });

    it('gets results for a simple map', () => {
      const missionMap = new MissionMap({
        terrainTileMap: smallMap
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.findPathToStopLocation(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer},
        stopLocation: {q: 0 as Integer, r: 1 as Integer}
      }));

      let routeFound: SearchPath;
      if (
        allMovableTiles instanceof SearchResults
      ) {
        let routeOrError = allMovableTiles.getRouteToStopLocation();
        if (routeOrError instanceof SearchPath) {
          routeFound = routeOrError;
        }
      }

      expect(routeFound.getTotalCost()).toEqual(1);
      expect(routeFound.getDestination()).toStrictEqual({
        q: 0 as Integer,
        r: 1 as Integer,
      });
      expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
        q: 0 as Integer,
        r: 1 as Integer,
        movementCost: 1,
      });
      expect(routeFound.getTilesTraveled()).toStrictEqual([
        {
          q: 0 as Integer,
          r: 0 as Integer,
          movementCost: 0,
        },
        {
          q: 0 as Integer,
          r: 1 as Integer,
          movementCost: 1,
        }
      ])
    });

    it('throws an error if no stopLocation is provided', () => {
      const missionMap = new MissionMap({
        terrainTileMap: smallMap
      })
      const pathfinder = new Pathfinder();

      const somePathOrError = pathfinder.findPathToStopLocation(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer},
      }));

      expect(somePathOrError).toEqual(expect.any(Error));
      expect((somePathOrError as Error).message.includes("no stop location was given")).toBeTruthy();
    });

    it('throws an error if results object has no stop location', () => {
      const missionMap = new MissionMap({
        terrainTileMap: smallMap
      })
      const pathfinder = new Pathfinder();

      const allTiles = pathfinder.getAllReachableTiles(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer},
      }));

      let somePathOrError;
      if (
        allTiles instanceof SearchResults
      ) {
        somePathOrError = allTiles.getRouteToStopLocation();
      }
      expect(somePathOrError).toEqual(expect.any(Error));
      expect((somePathOrError as Error).message.includes("no stop location was given")).toBeTruthy();
    });

    it('returns undefined if there is no closest route to a given location', () => {
      const missionMap = new MissionMap({
        terrainTileMap: smallMap
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.findPathToStopLocation(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer},
        stopLocation: {q: 9000 as Integer, r: 2 as Integer}
      }));

      let routeFound: SearchPath;
      if (
        allMovableTiles instanceof SearchResults
      ) {
        let routeOrError = allMovableTiles.getRouteToStopLocation();
        if (routeOrError instanceof SearchPath) {
          routeFound = routeOrError;
        }
      }
      expect(routeFound).toBeUndefined();
    });

    it('can stop on the tile it starts on', () => {
      const missionMap = new MissionMap({
        terrainTileMap: smallMap
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.findPathToStopLocation(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer},
        stopLocation: {q: 0 as Integer, r: 0 as Integer}
      }));

      let routeFound: SearchPath;
      if (
        allMovableTiles instanceof SearchResults
      ) {
        let routeOrError = allMovableTiles.getRouteToStopLocation();
        if (routeOrError instanceof SearchPath) {
          routeFound = routeOrError;
        }
      }

      expect(routeFound.getTotalCost()).toEqual(0);
      expect(routeFound.getDestination()).toStrictEqual({
        q: 0 as Integer,
        r: 0 as Integer,
      });
      expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
        q: 0 as Integer,
        r: 0 as Integer,
        movementCost: 0,
      });
      expect(routeFound.getTilesTraveled()).toStrictEqual([
        {
          q: 0 as Integer,
          r: 0 as Integer,
          movementCost: 0,
        },
      ]);
    });

    it('chooses the route with the fewest number of tiles if all tiles have the same movement cost', () => {
      const mapWithMultipleRoutes = new TerrainTileMap({
        movementCost: [
          "1 x x ",
          " 1 x x ",
          "  1 1 1 ",
        ]
      });

      const missionMap = new MissionMap({
        terrainTileMap: mapWithMultipleRoutes
      })
      const pathfinder = new Pathfinder();

      const allMovableTiles = pathfinder.findPathToStopLocation(new SearchParams({
        missionMap: missionMap,
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 2,
          traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        }),
        startLocation: {q: 0 as Integer, r: 0 as Integer},
        stopLocation: {q: 2 as Integer, r: 2 as Integer}
      }));

      let routeFound: SearchPath;
      if (
        allMovableTiles instanceof SearchResults
      ) {
        let routeOrError = allMovableTiles.getRouteToStopLocation();
        if (routeOrError instanceof SearchPath) {
          routeFound = routeOrError;
        }
      }

      expect(routeFound.getTotalCost()).toEqual(4);
      expect(routeFound.getDestination()).toStrictEqual({
        q: 2 as Integer,
        r: 2 as Integer,
      });
      expect(routeFound.getMostRecentTileLocation()).toStrictEqual({
        q: 2 as Integer,
        r: 2 as Integer,
        movementCost: 4,
      });

      expect(routeFound.getTilesTraveled()).toStrictEqual([
        {
          q: 0 as Integer,
          r: 0 as Integer,
          movementCost: 0,
        },
        {
          q: 1 as Integer,
          r: 0 as Integer,
          movementCost: 1,
        },
        {
          q: 2 as Integer,
          r: 0 as Integer,
          movementCost: 2,
        },
        {
          q: 2 as Integer,
          r: 1 as Integer,
          movementCost: 3,
        },
        {
          q: 2 as Integer,
          r: 2 as Integer,
          movementCost: 4,
        },
      ]);

      expect(routeFound.getTilesTraveledByNumberOfMovementActions()).toStrictEqual([
        [
          {
            q: 0 as Integer,
            r: 0 as Integer,
            movementCost: 0,
          },
        ],
        [
          {
            q: 1 as Integer,
            r: 0 as Integer,
            movementCost: 1,
          },
          {
            q: 2 as Integer,
            r: 0 as Integer,
            movementCost: 2,
          },
        ],
        [
          {
            q: 2 as Integer,
            r: 1 as Integer,
            movementCost: 3,
          },
          {
            q: 2 as Integer,
            r: 2 as Integer,
            movementCost: 4,
          },
        ]
      ]);
    });
    //it('chooses the route with the lowest movement cost', () => {});
    //it('will stop if it is out of movement actions', () => {});
    //it('gets as close as it can if the destination is blocked', () => {});
  });
});
