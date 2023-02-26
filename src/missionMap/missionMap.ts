import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexCoordinate, HexCoordinateToKey, Integer} from "../hexMap/hexGrid";
import {SquaddieID} from "../squaddie/id";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexMapLocationInfo} from "../hexMap/HexMapLocationInfo";

type RequiredOptions = {
  terrainTileMap: TerrainTileMap;
}

export class MissionMap {
  terrainTileMap: TerrainTileMap;
  squaddiesById: {
    [id: string]: {
      q: Integer;
      r: Integer;
      squaddieID: SquaddieID;
    };
  }

  squaddiesByLocation: {
    [coordinate: string]: {
      q: Integer;
      r: Integer;
      id: string;
    }
  }

  constructor(options: RequiredOptions) {
    this.terrainTileMap = options.terrainTileMap;
    this.squaddiesById = {};
    this.squaddiesByLocation = {};
  }

  addSquaddie(squaddieID: SquaddieID, hexCoordinate: HexCoordinate): Error | undefined {
    const coordinateKey: string = HexCoordinateToKey(hexCoordinate);
    if(this.squaddiesByLocation[coordinateKey]) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, already occupied by ${this.squaddiesByLocation[coordinateKey].id}`);
    }
    if(!this.terrainTileMap.areCoordinatesOnMap(hexCoordinate)) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, not on map`);
    }

    this.squaddiesByLocation[coordinateKey] = {
      q: hexCoordinate.q,
      r: hexCoordinate.r,
      id: squaddieID.id,
    }
    this.squaddiesById[squaddieID.id] = {
      q: hexCoordinate.q,
      r: hexCoordinate.r,
      squaddieID: squaddieID
    };

    return undefined;
  }

  getSquaddieLocationById(id: string): HexCoordinate {
    const locationInfo = this.squaddiesById[id];
    if (!locationInfo) {
      return {
        q: undefined,
        r: undefined
      };
    }

    return {
      q: locationInfo.q,
      r: locationInfo.r
    }
  }

  getSquaddieAtLocation(hexCoordinate: HexCoordinate): {
    q: Integer;
    r: Integer;
    id: string;
  } {
    const coordinateKey: string = HexCoordinateToKey(hexCoordinate);
    return this.squaddiesByLocation[coordinateKey];
  }

  getTerrainTileTypeAtLocation(hexCoordinate: HexCoordinate): HexGridMovementCost {
    return this.terrainTileMap.getTileTerrainTypeAtLocation(hexCoordinate);
  }

  areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
    return this.terrainTileMap.areCoordinatesOnMap(hexCoordinate);
  }

  getMapInformationForLocation(hexCoordinate: HexCoordinate): HexMapLocationInfo {
    const squaddieAtLocation = this.getSquaddieAtLocation(hexCoordinate);
    const squaddieId = squaddieAtLocation ? squaddieAtLocation.id : undefined;

    const tileTerrainType = this.getTerrainTileTypeAtLocation(hexCoordinate);
    const q = tileTerrainType ? hexCoordinate.q : undefined;
    const r = tileTerrainType ? hexCoordinate.r : undefined;

    return {
      q,
      r,
      squaddieId,
      tileTerrainType
    }
  }
}
