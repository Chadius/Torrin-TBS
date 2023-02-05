import {HexCoordinate, HexGridTile, Integer} from "./hexGrid";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {convertStringToMovementCost, HexGridMovementCost} from "./hexGridMovementCost";
import {convertWorldCoordinatesToMapCoordinates} from "./convertCoordinates";
import {ResourceHandler} from "../resource/resourceHandler";
import {PulseBlendColor} from "./colorUtils";

export type HexMapOptions = {
  tiles?: HexGridTile[];
  movementCost?: string[];
  resourceHandler?: ResourceHandler;
}

function convertMovementCostToTiles(movementCost: string[]): HexGridTile[] {
  const newTiles: HexGridTile[] = [];
  movementCost.forEach((costString, q_index) => {
    let r_index = 0 - Math.floor(q_index / 2);
    if (q_index % 2 !== costString.length % 2) {
      throw new Error (`movementCost validation failed: row ${q_index} `
        + `must have ${q_index % 2 === 0 ? 'even' : 'odd'} length,`
        + `but is ${costString.length}`
      );
    }
    let costStringIndex = costString.length % 2 === 0 ? 0 : 1;

    while(costStringIndex < costString.length) {
      let stringToConvert = costString.slice(costStringIndex, costStringIndex + 2);
      let movementCostType = convertStringToMovementCost(stringToConvert);
      newTiles.push(new HexGridTile(
        q_index as Integer,
        r_index as Integer,
        movementCostType
      ));

      r_index += 1;
      costStringIndex += 2;
    }
  });
  return newTiles;
}

export type HighlightTileDescription = {
  tiles: HexCoordinate[],
  pulseColor: PulseBlendColor,
  name: string,
};

export class HexMap {
  tiles: HexGridTile[];
  outlineTileCoordinates: HexCoordinate | undefined;
  highlightedTiles: {[coordinateKey: string]: {
    pulseColor: PulseBlendColor,
    name: string
  }};
  resourceHandler: ResourceHandler;

  constructor(options: HexMapOptions) {
    let tiles: HexGridTile[] = options.tiles;
    let movementCost: string[] = options.movementCost;

    if(tiles === undefined) {
      tiles = convertMovementCostToTiles(movementCost);
    }

    const tilesSortedByRThenQ = [...tiles].sort((a, b) => {
      if (a.r < b.r) {
        return -1;
      }
      if (a.r > b.r) {
        return 1;
      }

      if (a.q < b.q) {
        return -1;
      }
      if (a.q > b.q) {
        return 1;
      }
      return 0;
    })

    this.tiles = tilesSortedByRThenQ;
    this.highlightedTiles = {};

    this.resourceHandler = options.resourceHandler;
  }

  mouseClicked(mouseX: number, mouseY: number) {
    const worldX = mouseX - SCREEN_WIDTH / 2;
    const worldY = mouseY - SCREEN_HEIGHT / 2;
    const tileCoordinates = convertWorldCoordinatesToMapCoordinates(worldX, worldY);

    if (
      this.tiles.some((tile) => tile.q == tileCoordinates[0] && tile.r == tileCoordinates[1])
    ) {
      this.outlineTileCoordinates = {
        q: tileCoordinates[0] as Integer,
        r: tileCoordinates[1] as Integer,
      }
    } else {
      this.outlineTileCoordinates = undefined;
    }
  }

  highlightTiles(
    highlightTileDescriptions: HighlightTileDescription[]
  ): void {
    this.highlightedTiles = {};
    highlightTileDescriptions.reverse().forEach((tileDesc) => {
      tileDesc.tiles.forEach((tile) => {
        const key = `${tile.q},${tile.r}`;
        this.highlightedTiles[key] = {
          pulseColor: tileDesc.pulseColor,
          name: tileDesc.name
        };
      })
    });
  }

  stopHighlightingTiles(): void {
    this.highlightedTiles = {};
  }

  private getTileAtLocation(hexCoordinate: HexCoordinate): HexGridTile | undefined {
    return this.tiles.find((tile) =>
      tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
    );
  }

  getTileTerrainTypeAtLocation(hexCoordinate: HexCoordinate): HexGridMovementCost | undefined {
    const tile = this.getTileAtLocation(hexCoordinate);
    if (tile === undefined) {
      return undefined;
    }
    return tile.terrainType;
  }

  areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
    return this.getTileAtLocation(hexCoordinate) !== undefined;
  }
}
