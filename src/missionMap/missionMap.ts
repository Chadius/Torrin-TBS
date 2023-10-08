import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

export class MissionMapSquaddieDatum {
    constructor(info?: { dynamicSquaddieId: string, squaddietemplateId: string, mapLocation?: HexCoordinate }) {
        if (!info) {
            info = {
                dynamicSquaddieId: undefined,
                squaddietemplateId: undefined,
            };
        }

        this._dynamicSquaddieId = info.dynamicSquaddieId;
        this._squaddietemplateId = info.squaddietemplateId;
        this._mapLocation = info.mapLocation;
    }

    private _dynamicSquaddieId: string;

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
    }

    private _squaddietemplateId: string;

    get squaddietemplateId(): string {
        return this._squaddietemplateId;
    }

    private _mapLocation?: HexCoordinate;

    get mapLocation(): HexCoordinate {
        return this._mapLocation;
    }

    set mapLocation(value: HexCoordinate) {
        this._mapLocation = value;
    }

    static clone(datum: MissionMapSquaddieDatum): MissionMapSquaddieDatum {
        return new MissionMapSquaddieDatum({
            squaddietemplateId: datum._squaddietemplateId,
            dynamicSquaddieId: datum._dynamicSquaddieId,
            mapLocation: datum._mapLocation,
        });
    }

    isValid() {
        return this._dynamicSquaddieId !== undefined && this._squaddietemplateId !== undefined;
    }
}

export class MissionMap {
    private readonly _terrainTileMap: TerrainTileMap;
    private readonly _squaddieInfo: MissionMapSquaddieDatum[];

    constructor({terrainTileMap}: {
        terrainTileMap: TerrainTileMap;
    }) {
        this._terrainTileMap = terrainTileMap;
        this._squaddieInfo = [];
        this._squaddiesHidden = [];
    }

    get terrainTileMap(): TerrainTileMap {
        return this._terrainTileMap;
    }

    get squaddieInfo(): MissionMapSquaddieDatum[] {
        return this._squaddieInfo;
    }

    private _squaddiesHidden: string[];

    get squaddiesHidden(): string[] {
        return this._squaddiesHidden;
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return this._terrainTileMap.areCoordinatesOnMap(hexCoordinate);
    }

    addSquaddie(squaddietemplateId: string, dynamicSquaddieId: string, location?: HexCoordinate): Error | undefined {
        if (location && !this._terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot add ${dynamicSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        const squaddieWithDynamicId: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        if (squaddieWithDynamicId) {
            return new Error(`${dynamicSquaddieId} already added`);
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieDatum = this.getSquaddieAtLocation(location);
        if (squaddieAlreadyOccupyingLocation.isValid()) {
            return new Error(`cannot add ${dynamicSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.dynamicSquaddieId}`);
        }

        this._squaddieInfo.push(new MissionMapSquaddieDatum({
            squaddietemplateId,
            dynamicSquaddieId,
            mapLocation: location,
        }));
        return undefined;
    }

    getSquaddieAtLocation(location: HexCoordinate): MissionMapSquaddieDatum {
        const foundDatum: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            location && datum.mapLocation && datum.mapLocation.q === location.q && datum.mapLocation.r === location.r
        );
        return foundDatum ? MissionMapSquaddieDatum.clone(foundDatum) : new MissionMapSquaddieDatum();
    }

    getSquaddieByDynamicId(dynamicSquaddieId: string): MissionMapSquaddieDatum {
        const foundDatum: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        return foundDatum ? MissionMapSquaddieDatum.clone(foundDatum) : new MissionMapSquaddieDatum();
    }

    getHexGridMovementAtLocation(location: HexCoordinate): HexGridMovementCost {
        if (this._terrainTileMap.areCoordinatesOnMap(location)) {
            return this._terrainTileMap.getTileTerrainTypeAtLocation(location);
        }
        return undefined;
    }

    getSquaddiesThatHaveNoLocation(): MissionMapSquaddieDatum[] {
        return this._squaddieInfo.filter((datum) =>
            datum.mapLocation === undefined
        ).map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    updateSquaddieLocation(dynamicSquaddieId: string, location: HexCoordinate): Error | undefined {
        const foundDatum: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        if (!foundDatum) {
            return new Error(`cannot update position for ${dynamicSquaddieId}, does not exist`);
        }

        if (location && !this._terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot update position for ${dynamicSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        if (location) {
            const squaddieAtTheLocation = this.getSquaddieAtLocation(location);
            if (squaddieAtTheLocation.isValid() && squaddieAtTheLocation.dynamicSquaddieId !== dynamicSquaddieId) {
                return new Error(`cannot update position for ${dynamicSquaddieId} to (${location.q}, ${location.r}) already occupied by ${squaddieAtTheLocation.dynamicSquaddieId}`);
            }
        }

        foundDatum.mapLocation = location;
    }

    getAllSquaddieData(): MissionMapSquaddieDatum[] {
        return this._squaddieInfo.map((datum) => MissionMapSquaddieDatum.clone(datum))
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    getSquaddiesByStaticId(squaddietemplateId: string): MissionMapSquaddieDatum[] {
        return this._squaddieInfo.filter((datum) => datum.squaddietemplateId === squaddietemplateId)
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    isSquaddieHiddenFromDrawing(dynamicSquaddieId: string): boolean {
        return this._squaddiesHidden.includes(dynamicSquaddieId);
    }

    hideSquaddieFromDrawing(dynamicSquaddieId: string) {
        if (!this.isSquaddieHiddenFromDrawing(dynamicSquaddieId)) {
            this._squaddiesHidden.push(dynamicSquaddieId);
        }
    }

    revealSquaddieForDrawing(dynamicSquaddieId: string) {
        if (this.isSquaddieHiddenFromDrawing(dynamicSquaddieId)) {
            this._squaddiesHidden = this._squaddiesHidden.filter(
                (id) => id !== dynamicSquaddieId
            );
        }
    }
}
