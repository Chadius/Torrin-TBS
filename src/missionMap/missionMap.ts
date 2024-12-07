import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import {
    MissionMapSquaddieLocation,
    MissionMapSquaddieLocationService,
} from "./squaddieLocation"
import {
    SquaddieDeployment,
    SquaddieDeploymentService,
} from "./squaddieDeployment"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { isValidValue } from "../utils/validityCheck"

export interface MissionMap {
    playerDeployment: SquaddieDeployment
    terrainTileMap: TerrainTileMap
    squaddieInfo: MissionMapSquaddieLocation[]
    squaddiesHidden: string[]
}

export const MissionMapService = {
    new: ({
        terrainTileMap,
    }: {
        terrainTileMap: TerrainTileMap
    }): MissionMap => ({
        terrainTileMap: terrainTileMap,
        squaddieInfo: [],
        squaddiesHidden: [],
        playerDeployment: SquaddieDeploymentService.new({
            affiliation: SquaddieAffiliation.PLAYER,
        }),
    }),
    default: (): MissionMap => {
        return NullMissionMap()
    },
    addSquaddie: ({
        missionMap,
        squaddieTemplateId,
        battleSquaddieId,
        coordinate,
    }: {
        missionMap: MissionMap
        squaddieTemplateId: string
        battleSquaddieId: string
        coordinate?: HexCoordinate
    }): Error | undefined => {
        if (
            coordinate !== undefined &&
            !TerrainTileMapService.isLocationOnMap(
                missionMap.terrainTileMap,
                coordinate
            )
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${coordinate.q}, ${coordinate.r}) is not on map`
            )
        }

        const battleSquaddieWithId: MissionMapSquaddieLocation =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        if (battleSquaddieWithId) {
            return new Error(`${battleSquaddieId} already added`)
        }

        const squaddieAlreadyOccupyingLocation: MissionMapSquaddieLocation =
            getSquaddieAtLocation(missionMap, coordinate)
        if (
            MissionMapSquaddieLocationService.isValid(
                squaddieAlreadyOccupyingLocation
            ) &&
            !!coordinate
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${coordinate.q}, ${coordinate.r}), already occupied by ${squaddieAlreadyOccupyingLocation.battleSquaddieId}`
            )
        }

        missionMap.squaddieInfo.push({
            squaddieTemplateId,
            battleSquaddieId,
            mapCoordinate: coordinate,
        })
        return undefined
    },
    getByBattleSquaddieId: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): MissionMapSquaddieLocation => {
        if (!isValidValue(missionMap)) {
            return {
                mapCoordinate: undefined,
                squaddieTemplateId: undefined,
                battleSquaddieId: undefined,
            }
        }
        const foundDatum: MissionMapSquaddieLocation =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        return foundDatum
            ? MissionMapSquaddieLocationService.clone(foundDatum)
            : {
                  battleSquaddieId: undefined,
                  squaddieTemplateId: undefined,
                  mapCoordinate: undefined,
              }
    },
    updateBattleSquaddieLocation: (
        missionMap: MissionMap,
        battleSquaddieId: string,
        location: HexCoordinate
    ): Error | undefined => {
        const foundDatum: MissionMapSquaddieLocation =
            missionMap.squaddieInfo.find(
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
                missionMap.terrainTileMap,
                location
            )
        ) {
            return new Error(
                `cannot update position for ${battleSquaddieId} to (${location.q}, ${location.r}) is not on map`
            )
        }

        if (location) {
            const squaddieAtTheLocation = getSquaddieAtLocation(
                missionMap,
                location
            )
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

        foundDatum.mapCoordinate = location
    },
    getBattleSquaddieAtLocation: (
        missionMap: MissionMap,
        location: HexCoordinate
    ): MissionMapSquaddieLocation => {
        return getSquaddieAtLocation(missionMap, location)
    },
    getSquaddiesThatHaveNoLocation: (missionMap: MissionMap) =>
        missionMap.squaddieInfo
            .filter((datum) => datum.mapCoordinate === undefined)
            .map((datum) => MissionMapSquaddieLocationService.clone(datum)),
    getAllSquaddieData: (missionMap: MissionMap) =>
        missionMap.squaddieInfo.map((datum) =>
            MissionMapSquaddieLocationService.clone(datum)
        ),
    isSquaddieHiddenFromDrawing: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): boolean => isSquaddieHiddenFromDrawing(missionMap, battleSquaddieId),
    hideSquaddieFromDrawing: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): void => {
        if (!isSquaddieHiddenFromDrawing(missionMap, battleSquaddieId)) {
            missionMap.squaddiesHidden.push(battleSquaddieId)
        }
    },
    revealSquaddieForDrawing: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): void => {
        if (isSquaddieHiddenFromDrawing(missionMap, battleSquaddieId)) {
            missionMap.squaddiesHidden = missionMap.squaddiesHidden.filter(
                (id) => id !== battleSquaddieId
            )
        }
    },
}

const getSquaddieAtLocation = (
    missionMap: MissionMap,
    location: HexCoordinate
): MissionMapSquaddieLocation => {
    const foundDatum: MissionMapSquaddieLocation = missionMap.squaddieInfo.find(
        (datum) =>
            location &&
            datum.mapCoordinate &&
            datum.mapCoordinate.q === location.q &&
            datum.mapCoordinate.r === location.r
    )
    return foundDatum
        ? MissionMapSquaddieLocationService.clone(foundDatum)
        : {
              battleSquaddieId: undefined,
              squaddieTemplateId: undefined,
              mapCoordinate: undefined,
          }
}

const isSquaddieHiddenFromDrawing = (
    missionMap: MissionMap,
    battleSquaddieId: string
): boolean => {
    return missionMap.squaddiesHidden.includes(battleSquaddieId)
}
