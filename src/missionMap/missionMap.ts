import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexCoordinate, HexCoordinateToKey} from "../hexMap/hexGrid";
import {SquaddieId} from "../squaddie/id";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexMapLocationInfo} from "../hexMap/HexMapLocationInfo";

type RequiredOptions = {
    terrainTileMap: TerrainTileMap;
}

export class MissionMap {
    terrainTileMap: TerrainTileMap;
    staticSquaddiesById: {
        [id: string]: {
            q: number;
            r: number;
            squaddieId: SquaddieId;
        };
    }

    staticSquaddiesByLocation: {
        [coordinate: string]: {
            q: number;
            r: number;
            id: string;
        }
    }

    constructor(options: RequiredOptions) {
        this.terrainTileMap = options.terrainTileMap;
        this.staticSquaddiesById = {};
        this.staticSquaddiesByLocation = {};
    }

    addStaticSquaddieByLocation(squaddieID: SquaddieId, hexCoordinate: HexCoordinate): Error | undefined {
        const coordinateKey: string = HexCoordinateToKey(hexCoordinate);
        if (this.staticSquaddiesByLocation[coordinateKey]) {
            return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, already occupied by ${this.staticSquaddiesByLocation[coordinateKey].id}`);
        }
        if (!this.terrainTileMap.areCoordinatesOnMap(hexCoordinate)) {
            return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, not on map`);
        }

        this.staticSquaddiesByLocation[coordinateKey] = {
            q: hexCoordinate.q,
            r: hexCoordinate.r,
            id: squaddieID.staticId,
        }
        this.staticSquaddiesById[squaddieID.staticId] = {
            q: hexCoordinate.q,
            r: hexCoordinate.r,
            squaddieId: squaddieID
        };

        return undefined;
    }

    getStaticSquaddieLocationById(staticSquaddieId: string): HexCoordinate {
        const locationInfo = this.staticSquaddiesById[staticSquaddieId];
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

    getStaticSquaddieAtLocation(hexCoordinate: HexCoordinate): SquaddieId {
        const coordinateKey: string = HexCoordinateToKey(hexCoordinate);
        const moreInfo = this.staticSquaddiesByLocation[coordinateKey];
        if (!moreInfo) {
            return undefined;
        }
        return this.staticSquaddiesById[moreInfo.id]?.squaddieId;
    }

    getAllStaticSquaddieIds() {
        return Object.values(this.staticSquaddiesById).map(info =>
            info.squaddieId
        );
    }

    getTerrainTileTypeAtLocation(hexCoordinate: HexCoordinate): HexGridMovementCost {
        return this.terrainTileMap.getTileTerrainTypeAtLocation(hexCoordinate);
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return this.terrainTileMap.areCoordinatesOnMap(hexCoordinate);
    }

    getMapInformationForLocation(hexCoordinate: HexCoordinate): HexMapLocationInfo {
        const staticSquaddieAtLocation = this.getStaticSquaddieAtLocation(hexCoordinate);
        const staticSquaddieId = staticSquaddieAtLocation ? staticSquaddieAtLocation.staticId : undefined;

        const tileTerrainType = this.getTerrainTileTypeAtLocation(hexCoordinate);
        const q = tileTerrainType ? hexCoordinate.q : undefined;
        const r = tileTerrainType ? hexCoordinate.r : undefined;

        return {
            q,
            r,
            squaddieId: staticSquaddieId,
            tileTerrainType
        }
    }

    updateStaticSquaddiePosition(id: string, mapLocation: HexCoordinate): Error | undefined {
        const staticSquaddieToMoveInfo = this.staticSquaddiesById[id];
        if (!staticSquaddieToMoveInfo) {
            return new Error(`updateSquaddieLocation: no static squaddie with id ${id}`);
        }

        const squaddieToMoveCoordinateKey = HexCoordinateToKey({
            q: staticSquaddieToMoveInfo.q,
            r: staticSquaddieToMoveInfo.r,
        });
        delete this.staticSquaddiesByLocation[squaddieToMoveCoordinateKey];

        return this.addStaticSquaddieByLocation(staticSquaddieToMoveInfo.squaddieId, mapLocation);
    }
}
