import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {MissionMapSquaddieLocation, MissionMapSquaddieLocationHandler} from "./squaddieLocation";
import {SquaddieDeployment, SquaddieDeploymentHelper} from "./squaddieDeployment";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";

export const MissionMapHelper = {
    new: ({terrainTileMap}: { terrainTileMap: TerrainTileMap }): MissionMap => {
        return new MissionMap({terrainTileMap});
    },
    default: (): MissionMap => {
        return NullMissionMap();
    },
    addSquaddie: (missionMap: MissionMap, squaddieTemplateId: string, battleSquaddieId: string, location?: HexCoordinate): Error | undefined => {
        return missionMap.addSquaddie(squaddieTemplateId, battleSquaddieId, location);
    }
};


export class MissionMap {
    playerDeployment: SquaddieDeployment;
    private readonly _terrainTileMap: TerrainTileMap;
    private readonly _squaddieInfo: MissionMapSquaddieLocation[];
    private _squaddiesHidden: string[];

    constructor({terrainTileMap}: {
        terrainTileMap: TerrainTileMap;
    }) {
        this._terrainTileMap = terrainTileMap;
        this._squaddieInfo = [];
        this._squaddiesHidden = [];
        this.playerDeployment = SquaddieDeploymentHelper.new({affiliation: SquaddieAffiliation.PLAYER});
    }

    get terrainTileMap(): TerrainTileMap {
        return this._terrainTileMap;
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
        if (MissionMapSquaddieLocationHandler.isValid(squaddieAlreadyOccupyingLocation)) {
            return new Error(`cannot add ${battleSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.battleSquaddieId}`);
        }

        this._squaddieInfo.push({
            squaddieTemplateId,
            battleSquaddieId,
            mapLocation: location,
        });
        return undefined;
    }

    getSquaddieAtLocation(location: HexCoordinate): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            location && datum.mapLocation && datum.mapLocation.q === location.q && datum.mapLocation.r === location.r
        );
        return foundDatum ? MissionMapSquaddieLocationHandler.clone(foundDatum) : {
            battleSquaddieId: undefined,
            squaddieTemplateId: undefined,
            mapLocation: undefined,
        };
    }

    getSquaddieByBattleId(battleSquaddieId: string): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find((datum) =>
            datum.battleSquaddieId === battleSquaddieId
        );
        return foundDatum ? MissionMapSquaddieLocationHandler.clone(foundDatum) : {
            battleSquaddieId: undefined,
            squaddieTemplateId: undefined,
            mapLocation: undefined
        };
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
        ).map((datum) => MissionMapSquaddieLocationHandler.clone(datum));
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
            if (MissionMapSquaddieLocationHandler.isValid(squaddieAtTheLocation) && squaddieAtTheLocation.battleSquaddieId !== battleSquaddieId) {
                return new Error(`cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) already occupied by ${squaddieAtTheLocation.battleSquaddieId}`);
            }
        }

        foundDatum.mapLocation = location;
    }

    getAllSquaddieData(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo.map((datum) => MissionMapSquaddieLocationHandler.clone(datum))
            .map((datum) => MissionMapSquaddieLocationHandler.clone(datum));
    }

    getSquaddiesByTemplateId(squaddieTemplateId: string): MissionMapSquaddieLocation[] {
        return this._squaddieInfo.filter((datum) => datum.squaddieTemplateId === squaddieTemplateId)
            .map((datum) => MissionMapSquaddieLocationHandler.clone(datum));
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
