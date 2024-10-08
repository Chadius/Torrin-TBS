import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import {
    MissionMapSquaddieLocation,
    MissionMapSquaddieLocationService,
} from "./squaddieLocation"
import {
    SquaddieDeployment,
    SquaddieDeploymentHelper,
} from "./squaddieDeployment"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { isValidValue } from "../utils/validityCheck"

export const MissionMapService = {
    new: ({
        terrainTileMap,
    }: {
        terrainTileMap: TerrainTileMap
    }): MissionMap => {
        return new MissionMap({ terrainTileMap })
    },
    default: (): MissionMap => {
        return NullMissionMap()
    },
    addSquaddie: ({
        missionMap,
        squaddieTemplateId,
        battleSquaddieId,
        location,
    }: {
        missionMap: MissionMap
        squaddieTemplateId: string
        battleSquaddieId: string
        location?: HexCoordinate
    }): Error | undefined => {
        return missionMap.addSquaddie(
            squaddieTemplateId,
            battleSquaddieId,
            location
        )
    },
    getByBattleSquaddieId: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): MissionMapSquaddieLocation => {
        if (!isValidValue(missionMap)) {
            return {
                mapLocation: undefined,
                squaddieTemplateId: undefined,
                battleSquaddieId: undefined,
            }
        }
        return missionMap.getSquaddieByBattleId(battleSquaddieId)
    },
    updateBattleSquaddieLocation: (
        missionMap: MissionMap,
        battleSquaddieId: string,
        location: HexCoordinate
    ): Error | undefined => {
        return missionMap.updateSquaddieLocation(battleSquaddieId, location)
    },
    getBattleSquaddieAtLocation: (
        missionMap: MissionMap,
        location: HexCoordinate
    ): MissionMapSquaddieLocation => {
        return missionMap.getSquaddieAtLocation(location)
    },
}

export class MissionMap {
    playerDeployment: SquaddieDeployment
    private readonly _terrainTileMap: TerrainTileMap
    private readonly _squaddieInfo: MissionMapSquaddieLocation[]
    private _squaddiesHidden: string[]

    constructor({ terrainTileMap }: { terrainTileMap: TerrainTileMap }) {
        this._terrainTileMap = terrainTileMap
        this._squaddieInfo = []
        this._squaddiesHidden = []
        this.playerDeployment = SquaddieDeploymentHelper.new({
            affiliation: SquaddieAffiliation.PLAYER,
        })
    }

    get terrainTileMap(): TerrainTileMap {
        return this._terrainTileMap
    }

    addSquaddie(
        squaddieTemplateId: string,
        battleSquaddieId: string,
        location?: HexCoordinate
    ): Error | undefined {
        if (
            location !== undefined &&
            !TerrainTileMapService.isLocationOnMap(
                this._terrainTileMap,
                location
            )
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`
            )
        }

        const battleSquaddieWithId: MissionMapSquaddieLocation =
            this._squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        if (battleSquaddieWithId) {
            return new Error(`${battleSquaddieId} already added`)
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieLocation =
            this.getSquaddieAtLocation(location)
        if (
            MissionMapSquaddieLocationService.isValid(
                squaddieAlreadyOccupyingLocation
            )
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${location.q}, ${location.r}), already occupied by ${squaddieAlreadyOccupyingLocation.battleSquaddieId}`
            )
        }

        this._squaddieInfo.push({
            squaddieTemplateId,
            battleSquaddieId,
            mapLocation: location,
        })
        return undefined
    }

    getSquaddieAtLocation(location: HexCoordinate): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find(
            (datum) =>
                location &&
                datum.mapLocation &&
                datum.mapLocation.q === location.q &&
                datum.mapLocation.r === location.r
        )
        return foundDatum
            ? MissionMapSquaddieLocationService.clone(foundDatum)
            : {
                  battleSquaddieId: undefined,
                  squaddieTemplateId: undefined,
                  mapLocation: undefined,
              }
    }

    getSquaddieByBattleId(
        battleSquaddieId: string
    ): MissionMapSquaddieLocation {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find(
            (datum) => datum.battleSquaddieId === battleSquaddieId
        )
        return foundDatum
            ? MissionMapSquaddieLocationService.clone(foundDatum)
            : {
                  battleSquaddieId: undefined,
                  squaddieTemplateId: undefined,
                  mapLocation: undefined,
              }
    }

    getHexGridMovementAtLocation(location: HexCoordinate): HexGridMovementCost {
        if (
            TerrainTileMapService.isLocationOnMap(
                this._terrainTileMap,
                location
            )
        ) {
            return TerrainTileMapService.getTileTerrainTypeAtLocation(
                this._terrainTileMap,
                location
            )
        }
        return undefined
    }

    getSquaddiesThatHaveNoLocation(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo
            .filter((datum) => datum.mapLocation === undefined)
            .map((datum) => MissionMapSquaddieLocationService.clone(datum))
    }

    updateSquaddieLocation(
        battleSquaddieId: string,
        location: HexCoordinate
    ): Error | undefined {
        const foundDatum: MissionMapSquaddieLocation = this._squaddieInfo.find(
            (datum) => datum.battleSquaddieId === battleSquaddieId
        )
        if (!foundDatum) {
            return new Error(
                `cannot update position for ${battleSquaddieId}, does not exist`
            )
        }

        if (
            location &&
            !TerrainTileMapService.isLocationOnMap(
                this._terrainTileMap,
                location
            )
        ) {
            return new Error(
                `cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`
            )
        }

        if (location) {
            const squaddieAtTheLocation = this.getSquaddieAtLocation(location)
            if (
                MissionMapSquaddieLocationService.isValid(
                    squaddieAtTheLocation
                ) &&
                squaddieAtTheLocation.battleSquaddieId !== battleSquaddieId
            ) {
                return new Error(
                    `cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) already occupied by ${squaddieAtTheLocation.battleSquaddieId}`
                )
            }
        }

        foundDatum.mapLocation = location
    }

    getAllSquaddieData(): MissionMapSquaddieLocation[] {
        return this._squaddieInfo
            .map((datum) => MissionMapSquaddieLocationService.clone(datum))
            .map((datum) => MissionMapSquaddieLocationService.clone(datum))
    }

    getSquaddiesByTemplateId(
        squaddieTemplateId: string
    ): MissionMapSquaddieLocation[] {
        return this._squaddieInfo
            .filter((datum) => datum.squaddieTemplateId === squaddieTemplateId)
            .map((datum) => MissionMapSquaddieLocationService.clone(datum))
    }

    isSquaddieHiddenFromDrawing(battleSquaddieId: string): boolean {
        return this._squaddiesHidden.includes(battleSquaddieId)
    }

    hideSquaddieFromDrawing(battleSquaddieId: string) {
        if (!this.isSquaddieHiddenFromDrawing(battleSquaddieId)) {
            this._squaddiesHidden.push(battleSquaddieId)
        }
    }

    revealSquaddieForDrawing(battleSquaddieId: string) {
        if (this.isSquaddieHiddenFromDrawing(battleSquaddieId)) {
            this._squaddiesHidden = this._squaddiesHidden.filter(
                (id) => id !== battleSquaddieId
            )
        }
    }
}
