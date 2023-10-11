import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

export class MissionMapSquaddieDatum {
    constructor(info?: { battleSquaddieId: string, squaddieTemplateId: string, mapLocation?: HexCoordinate }) {
        if (!info) {
            info = {
                battleSquaddieId: undefined,
                squaddieTemplateId: undefined,
            };
        }

        this._battleSquaddieId = info.battleSquaddieId;
        this._squaddieTemplateId = info.squaddieTemplateId;
        this._mapLocation = info.mapLocation;
    }

    private _battleSquaddieId: string;

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
    }

    private _squaddieTemplateId: string;

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
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

    addSquaddie(squaddieTemplateId: string, battleSquaddieId: string, location?: HexCoordinate): Error | undefined {
        if (location && !this._terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot add ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        const battleSquaddieWithId: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
        );
        if (battleSquaddieWithId) {
            return new Error(`${battleSquaddieId} already added`);
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieDatum = this.getSquaddieAtLocation(location);
        if (squaddieAlreadyOccupyingLocation.isValid()) {
            return new Error(`cannot add ${battleSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.battleSquaddieId}`);
        }

        this._squaddieInfo.push(new MissionMapSquaddieDatum({
            squaddieTemplateId,
            battleSquaddieId,
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

    getSquaddieByBattleId(battleSquaddieId: string): MissionMapSquaddieDatum {
        const foundDatum: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
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

    updateSquaddieLocation(battleSquaddieId: string, location: HexCoordinate): Error | undefined {
        const foundDatum: MissionMapSquaddieDatum = this._squaddieInfo.find((datum) =>
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

    getAllSquaddieData(): MissionMapSquaddieDatum[] {
        return this._squaddieInfo.map((datum) => MissionMapSquaddieDatum.clone(datum))
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    getSquaddiesByTemplateId(squaddieTemplateId: string): MissionMapSquaddieDatum[] {
        return this._squaddieInfo.filter((datum) => datum.squaddieTemplateId === squaddieTemplateId)
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
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
