import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexCoordinate} from "../hexMap/hexGrid";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";

type RequiredOptions = {
    terrainTileMap: TerrainTileMap;
}

export class MissionMapSquaddieDatum {
    dynamicSquaddieId: string;
    staticSquaddieId: string;
    mapLocation?: HexCoordinate;

    constructor(info: { dynamicSquaddieId: string, staticSquaddieId: string, mapLocation?: HexCoordinate }) {
        this.dynamicSquaddieId = info.dynamicSquaddieId;
        this.staticSquaddieId = info.staticSquaddieId;
        this.mapLocation = info.mapLocation;
    }

    isValid() {
        return this.dynamicSquaddieId !== undefined && this.staticSquaddieId !== undefined;
    }

    static clone(datum: MissionMapSquaddieDatum): MissionMapSquaddieDatum {
        return new MissionMapSquaddieDatum({
            staticSquaddieId: datum.staticSquaddieId,
            dynamicSquaddieId: datum.dynamicSquaddieId,
            mapLocation: datum.mapLocation,
        });
    }
}

function NullMissionMapSquaddieDatum(): MissionMapSquaddieDatum {
    return new MissionMapSquaddieDatum({
        dynamicSquaddieId: undefined,
        staticSquaddieId: undefined,
    });
}

export class MissionMap {
    terrainTileMap: TerrainTileMap;
    squaddieInfo: MissionMapSquaddieDatum[];

    constructor(options: RequiredOptions) {
        this.terrainTileMap = options.terrainTileMap;
        this.squaddieInfo = [];
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return this.terrainTileMap.areCoordinatesOnMap(hexCoordinate);
    }

    addSquaddie(staticSquaddieId: string, dynamicSquaddieId: string, location?: HexCoordinate): Error | undefined {
        if (location && !this.terrainTileMap.areCoordinatesOnMap(location)) {
            return new Error(`cannot add ${dynamicSquaddieId} to (${location.q}, ${location.r}) is not on map`);
        }

        const squaddieWithDynamicId: MissionMapSquaddieDatum = this.squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        if (squaddieWithDynamicId) {
            return new Error(`${dynamicSquaddieId} already added`);
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieDatum = this.getSquaddieAtLocation(location);
        if (squaddieAlreadyOccupyingLocation.isValid()) {
            return new Error(`cannot add ${dynamicSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.dynamicSquaddieId}`);
        }

        this.squaddieInfo.push(new MissionMapSquaddieDatum({
            staticSquaddieId,
            dynamicSquaddieId,
            mapLocation: location,
        }));
        return undefined;
    }

    getSquaddieAtLocation(location: HexCoordinate): MissionMapSquaddieDatum {
        const foundDatum: MissionMapSquaddieDatum = this.squaddieInfo.find((datum) =>
            location && datum.mapLocation && datum.mapLocation.q === location.q && datum.mapLocation.r === location.r
        );
        return foundDatum ? MissionMapSquaddieDatum.clone(foundDatum) : NullMissionMapSquaddieDatum();
    }

    getSquaddieByDynamicId(dynamicSquaddieId: string): MissionMapSquaddieDatum {
        const foundDatum: MissionMapSquaddieDatum = this.squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        return foundDatum ? MissionMapSquaddieDatum.clone(foundDatum) : NullMissionMapSquaddieDatum();
    }

    getHexGridMovementAtLocation(location: HexCoordinate): HexGridMovementCost {
        if (this.terrainTileMap.areCoordinatesOnMap(location)) {
            return this.terrainTileMap.getTileTerrainTypeAtLocation(location);
        }
        return undefined;
    }

    getSquaddiesThatHaveNoLocation(): MissionMapSquaddieDatum[] {
        return this.squaddieInfo.filter((datum) =>
            datum.mapLocation === undefined
        ).map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    updateSquaddieLocation(dynamicSquaddieId: string, location: HexCoordinate): Error | undefined {
        const foundDatum: MissionMapSquaddieDatum = this.squaddieInfo.find((datum) =>
            datum.dynamicSquaddieId === dynamicSquaddieId
        );
        if (!foundDatum) {
            return new Error(`cannot update position for ${dynamicSquaddieId}, does not exist`);
        }

        if (location && !this.terrainTileMap.areCoordinatesOnMap(location)) {
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
        return this.squaddieInfo.map((datum) => new MissionMapSquaddieDatum({...datum}))
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
    }

    getSquaddiesByStaticId(staticSquaddieId: string): MissionMapSquaddieDatum[] {
        return this.squaddieInfo.filter((datum) => datum.staticSquaddieId === staticSquaddieId)
            .map((datum) => MissionMapSquaddieDatum.clone(datum));
    }
}
