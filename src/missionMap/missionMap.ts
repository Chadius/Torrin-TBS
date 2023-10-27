import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

export interface MissionMapSquaddieLocationData {
    battleSquaddieId: string;
    squaddieTemplateId: string;
    mapLocation: HexCoordinate;
}

export class MissionMapSquaddieLocation implements MissionMapSquaddieLocationData {
    constructor(
        {
            battleSquaddieId,
            squaddieTemplateId,
            mapLocation,
        }: {
            battleSquaddieId: string;
            squaddieTemplateId: string;
            mapLocation: HexCoordinate;
        }
    ) {
        this._battleSquaddieId = battleSquaddieId;
        this._squaddieTemplateId = squaddieTemplateId;
        this._mapLocation = mapLocation;
    }

    private _battleSquaddieId: string;

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
    }

    private _squaddieTemplateId: string;

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    private _mapLocation: HexCoordinate;

    get mapLocation(): HexCoordinate {
        return this._mapLocation;
    }

    set mapLocation(value: HexCoordinate) {
        this._mapLocation = value;
    }

    static clone(datum: MissionMapSquaddieLocation): MissionMapSquaddieLocation {
        return new MissionMapSquaddieLocation({
            squaddieTemplateId: datum._squaddieTemplateId,
            battleSquaddieId: datum._battleSquaddieId,
            mapLocation: datum._mapLocation,
        });
    }

    isValid() {
        return this._battleSquaddieId !== undefined && this._squaddieTemplateId !== undefined;
    }
}

export class MissionMap {
    private readonly _terrainTileMap: TerrainTileMap;
    private readonly _squaddieInfo: MissionMapSquaddieLocation[];

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

    get squaddieInfo(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo;
    }

    private _squaddiesHidden: string[];

    get squaddiesHidden(): string[] {
        return this._squaddiesHidden;
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return this._terrainTileMap.areCoordinatesOnMap(hexCoordinate);
    }

    addSquaddie(squaddieTemplateId: string, battleSquaddieId: string, location?: HexCoordinate): Error | undefined {
        if (location !== undefined && !this._terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot add ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        const battleSquaddieWithId: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
        );
        if (battleSquaddieWithId) {
            return new Error(`${battleSquaddieId} already added`);
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieLocation = this.getSquaddieAtLocation(location);
        if (squaddieAlreadyOccupyingLocation.isValid()) {
            return new Error(`cannot add ${battleSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.battleSquaddieId}`);
        }

        this._squaddieInfo.push(new MissionMapSquaddieLocation({
            squaddieTemplateId,
            battleSquaddieId,
            mapLocation: location,
        }));
        return undefined;
    }

    getSquaddieAtLocation(location: HexCoordinate): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            location && datum.mapLocation && datum.mapLocation.q === location.q && datum.mapLocation.r === location.r
        );
        return foundDatum ? MissionMapSquaddieLocation.clone(foundDatum) : new MissionMapSquaddieLocation({
            battleSquaddieId: undefined,
            squaddieTemplateId: undefined,
            mapLocation: undefined,
        });
    }

    getSquaddieByBattleId(battleSquaddieId: string): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
        );
        return foundDatum ? MissionMapSquaddieLocation.clone(foundDatum) : new MissionMapSquaddieLocation({
            battleSquaddieId: undefined,
            squaddieTemplateId: undefined,
            mapLocation: undefined
        });
    }

    getHexGridMovementAtLocation(location: HexCoordinate): HexGridMovementCost {
        if (this._terrainTileMap.areCoordinatesOnMap(location)) {
            return this._terrainTileMap.getTileTerrainTypeAtLocation(location);
        }
        return undefined;
    }

    getSquaddiesThatHaveNoLocation(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo.filter((datum) =>
            datum.mapLocation === undefined
        ).map((datum) => MissionMapSquaddieLocation.clone(datum));
    }

    updateSquaddieLocation(battleSquaddieId: string, location: HexCoordinate): Error | undefined {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
        );
        if (!foundDatum) {
            return new Error(`cannot update position for ${battleSquaddieId}, does not exist`);
        }

        if (location && !this._terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        if (location) {
            const squaddieAtTheLocation = this.getSquaddieAtLocation(location);
            if (squaddieAtTheLocation.isValid() && squaddieAtTheLocation.battleSquaddieId !== battleSquaddieId) {
                return new Error(`cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) already occupied by ${squaddieAtTheLocation.battleSquaddieId}`);
            }
        }

        foundDatum.mapLocation = location;
    }

    getAllSquaddieData(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo.map((datum) => MissionMapSquaddieLocation.clone(datum))
            .map((datum) => MissionMapSquaddieLocation.clone(datum));
    }

    getSquaddiesByTemplateId(squaddieTemplateId: string): MissionMapSquaddieLocation[] {
        return this._squaddieInfo.filter((datum) => datum.squaddieTemplateId === squaddieTemplateId)
            .map((datum) => MissionMapSquaddieLocation.clone(datum));
    }

    isSquaddieHiddenFromDrawing(battleSquaddieId: string): boolean {
        return this._squaddiesHidden.includes(battleSquaddieId);
    }

    hideSquaddieFromDrawing(battleSquaddieId: string) {
        if (!this.isSquaddieHiddenFromDrawing(battleSquaddieId)) {
            this._squaddiesHidden.push(battleSquaddieId);
        }
    }

    revealSquaddieForDrawing(battleSquaddieId: string) {
        if (this.isSquaddieHiddenFromDrawing(battleSquaddieId)) {
            this._squaddiesHidden = this._squaddiesHidden.filter(
                (id) => id !== battleSquaddieId
            );
        }
    }
}
