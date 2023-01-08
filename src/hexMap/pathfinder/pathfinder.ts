import {HexMap} from "../hexMap";
import {SquaddieID} from "../../squaddie/id";
import {HexCoordinate, Integer} from "../hexGrid";
import {HexMapLocationInfo} from "../HexMapLocationInfo";

type RequiredOptions = {
  map: HexMap;
}
export class Pathfinder {
  map: HexMap;
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
    this.map = options.map;
    this.squaddiesById = {};
    this.squaddiesByLocation = {};
  }

  private makeCoordinateKey(q: Integer, r: Integer): string {
    return `${q},${r}`;
  }

  addSquaddie(squaddieID: SquaddieID, coord: HexCoordinate): Error | undefined {
    const coordinateKey: string = this.makeCoordinateKey(coord.q, coord.r);
    if(this.squaddiesByLocation[coordinateKey]) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, already occupied by ${this.squaddiesByLocation[coordinateKey].id}`);
    }
    if(!this.map.areCoordinatesOnMap(coord)) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, not on map`);
    }

    this.squaddiesByLocation[coordinateKey] = {
      q: coord.q,
      r: coord.r,
      id: squaddieID.id,
    }
    this.squaddiesById[squaddieID.id] = {
      q: coord.q,
      r: coord.r,
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

  getMapInformationForLocation(hexCoordinate: HexCoordinate): HexMapLocationInfo {
    const coordinateKey = this.makeCoordinateKey(hexCoordinate.q, hexCoordinate.r);

    const squaddieAtLocation = this.squaddiesByLocation[coordinateKey];
    const squaddieId = squaddieAtLocation ? squaddieAtLocation.id : undefined;

    const tileTerrainType = this.map.getTileTerrainTypeAtLocation(hexCoordinate);
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
