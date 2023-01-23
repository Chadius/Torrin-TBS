import {HexMap} from "../hexMap";
import {HexCoordinate, HexGridTile, Integer} from "../hexGrid";
import {SquaddieID} from "../../squaddie/id";
import {SquaddieResource} from "../../squaddie/resource";
import {Pathfinder, TileFoundDescription} from "./pathfinder";
import {HexGridMovementCost} from "../hexGridMovementCost";
import {HexDirection, moveOneTileInDirection} from "../hexGridDirection";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams} from "./searchParams";

describe('pathfinder', () => {
  let map: HexMap;
  let torrinSquaddie: SquaddieID;
  beforeEach(() => {
    map = new HexMap({
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
        mapIcon: "map_icon_torrin"
      })
    });
  });

  it('can add a squaddie and report its location', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    const squaddieMapCoordinate: HexCoordinate = pathfinder.getSquaddieLocationById(torrinSquaddie.id);
    expect(squaddieMapCoordinate.q).toBe(0);
    expect(squaddieMapCoordinate.r).toBe(1);
  });

  it('cannot add a squaddie to a location that is already occupied or off map', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    let error: Error;
    error = pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});
    expect(error).toBeUndefined();

    const sirCamilSquaddie = new SquaddieID({
      name: "Sir Camil",
      id: "001",
      resources: new SquaddieResource({
        mapIcon: "map_icon_sir_camil"
      })
    });

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: 1 as Integer});
    expect(error.message.includes("already occupied")).toBeTruthy();

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 2 as Integer, r: 1 as Integer});
    expect(error.message.includes("not on map")).toBeTruthy();

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: -1 as Integer});
    expect(error).toBeUndefined();
  });

  it('can see what is at a given location', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    let mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: 1 as Integer});
    expect(mapInformation.q).toBe(0);
    expect(mapInformation.r).toBe(1);
    expect(mapInformation.squaddieId).toBe(torrinSquaddie.id);
    expect(mapInformation.tileTerrainType).toBe(HexGridMovementCost.doubleMovement);

    mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: -1 as Integer});
    expect(mapInformation.q).toBe(0);
    expect(mapInformation.r).toBe(-1);
    expect(mapInformation.squaddieId).toBeUndefined();
    expect(mapInformation.tileTerrainType).toBe(HexGridMovementCost.singleMovement);

    mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: -5 as Integer});
    expect(mapInformation.q).toBeUndefined();
    expect(mapInformation.r).toBeUndefined();
    expect(mapInformation.squaddieId).toBeUndefined();
    expect(mapInformation.tileTerrainType).toBeUndefined();
  });

  it('returns unknown location for squaddies that does not exist', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    const squaddieMapCoordinate: HexCoordinate = pathfinder.getSquaddieLocationById("id does not exist");
    expect(squaddieMapCoordinate.q).toBeUndefined();
    expect(squaddieMapCoordinate.r).toBeUndefined();
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
      map = new HexMap({
        movementCost: [
          "  1 1 1 ",
          " 1 1 1 1 ",
          "  1 1 1 ",
        ]
      });

      const pathfinder = new Pathfinder({
        map: map
      });

      const origin: HexCoordinate = {q: 1 as Integer, r: 1 as Integer};
      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 1,
          passThroughWalls: false,
          crossOverPits: false
        }),
        numberOfActions: 1,
        startLocation: origin
      }));

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
      const lineMap = new HexMap({
        movementCost: [
          "1 1 1 1 "
        ]
      });

      const pathfinder = new Pathfinder({
        map: lineMap
      });

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 3,
          passThroughWalls: false,
          crossOverPits: false
        }),
        numberOfActions: 1,
        minimumDistanceMoved: 2,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles,
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
      map = new HexMap({
        movementCost: [
          "1 1 1 2 1 "
        ]
      });

      const pathfinder = new Pathfinder({
        map: map
      });

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 2,
          passThroughWalls: false,
          crossOverPits: false
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 1 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles,
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
      let map: HexMap;
      let wallTile: TileFoundDescription[];

      beforeEach(() => {
        map = new HexMap({
          movementCost: [
            "1 1 x 1 "
          ]
        });

        wallTile = [
          {q: 0 as Integer, r: 2 as Integer,},
        ];
      });

      it('will not search walls if movement cannot pass through walls', () => {
        const pathfinder = new Pathfinder({
          map: map
        });

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 2,
            passThroughWalls: false,
            crossOverPits: false
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles,
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
        const pathfinder = new Pathfinder({
          map: map
        });

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            passThroughWalls: true,
            crossOverPits: false
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles,
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
      let map: HexMap;
      let pathfinder: Pathfinder;
      beforeEach(() => {
        map = new HexMap({
          movementCost: [
            "1 1 - 1 "
          ]
        });
        pathfinder = new Pathfinder({
          map: map
        });
      });

      it('will not cross pits if specified', () => {
        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            passThroughWalls: false,
            crossOverPits: false
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles,
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
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 3,
            passThroughWalls: false,
            crossOverPits: true
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles,
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
        const pathfinder = new Pathfinder({
          map: map
        });

        const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 2,
            passThroughWalls: false,
            crossOverPits: true
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 0 as Integer}
        }));

        validateTilesAreFound(
          allMovableTiles,
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
      const map = new HexMap({
        movementCost: [
          "1 1 1 "
        ]
      });

      const pathfinder = new Pathfinder({
        map: map
      });

      const teammate = new SquaddieID({
        name: "teammate",
        id: "teammate",
        resources: new SquaddieResource({
          mapIcon: "map_icon_teammate"
        }),
      });

      pathfinder.addSquaddie(teammate, {q: 0 as Integer, r: 1 as Integer});

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
        squaddieMovement: new SquaddieMovement({
          movementPerAction: 3,
          passThroughWalls: false,
          crossOverPits: false
        }),
        numberOfActions: 1,
        startLocation: {q: 0 as Integer, r: 0 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles,
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
      let map: HexMap;
      let pathfinder: Pathfinder;
      let justTheCenter: TileFoundDescription[];
      let tilesNotFoundBecauseSearchBlockedByWall: TileFoundDescription[];
      let tilesWithin2HexesOfOrigin: TileFoundDescription[];

      beforeEach(() => {
        map = new HexMap({
          movementCost: [
            '1 1 ',
            ' 1 1 1 x 1 ',
            '  x 1 1 ',
            '   1 ',
          ]
        });

        pathfinder = new Pathfinder({
          map: map
        });

        justTheCenter = [
          {q: 1 as Integer, r: 1 as Integer}
        ];

        tilesNotFoundBecauseSearchBlockedByWall = [
          {q: 1 as Integer, r: 3 as Integer,},
          {q: 1 as Integer, r: 4 as Integer,},
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
          sourceTiles: justTheCenter,
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
          sourceTiles: justTheCenter,
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
          sourceTiles: justTheCenter,
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
          ...justTheCenter,
          {q: 1 as Integer, r: 2 as Integer}
        ];

        const meleeAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
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
      let bigMap: HexMap;
      let pathfinder: Pathfinder;
      let justTheCenter: TileFoundDescription[];

      beforeEach(() => {
        bigMap = new HexMap({
          movementCost: [
            '1 1 1 1 ',
            ' 1 1 1 1 x 1 ',
            '  1 1 ',
            '   1 ',
            '    1 ',
            '     1 ',
          ]
        });

        pathfinder = new Pathfinder({
          map: bigMap
        });

        justTheCenter = [
          {q: 1 as Integer, r: 1 as Integer}
        ];
      });

      it('single tile', () => {
        const movementRangeTiles: TileFoundDescription[] = [
          ...justTheCenter,
        ];

        const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
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
          ...justTheCenter,
          {q: 1 as Integer, r: 2 as Integer}
        ];

        const indirectAttackTiles: TileFoundDescription[] = pathfinder.getTilesInRange({
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
      let map: HexMap;
      let pathfinder: Pathfinder;
      let justTheCenter: TileFoundDescription[];

      beforeEach(() => {
        map = new HexMap({
          tiles: [
            new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.singleMovement),
            new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.wall),
            new HexGridTile(0 as Integer, 2 as Integer, HexGridMovementCost.singleMovement),
          ]
        });

        pathfinder = new Pathfinder({
          map: map
        });

        justTheCenter = [
          {q: 0 as Integer, r: 0 as Integer}
        ];
      });

      it('can be blocked by walls', () => {
        const blockedByWall: TileFoundDescription[] = pathfinder.getTilesInRange({
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
      map = new HexMap({
        movementCost: [
          "1 1 1 2 1 "
        ]
      });

      const pathfinder = new Pathfinder({
        map: map
      });

      const allMovableTiles = pathfinder.getAllReachableTiles(new SearchParams({
          squaddieMovement: new SquaddieMovement({
            movementPerAction: 2,
            passThroughWalls: false,
            crossOverPits: false,
          }),
          numberOfActions: 1,
          startLocation: {q: 0 as Integer, r: 1 as Integer}
      }));

      validateTilesAreFound(
        allMovableTiles,
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
});
