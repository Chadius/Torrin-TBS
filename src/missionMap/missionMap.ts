import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../hexMap/hexCoordinate/hexCoordinate"
import {
    MissionMapSquaddieCoordinate,
    MissionMapSquaddieCoordinateService,
} from "./squaddieCoordinate"
import {
    SquaddieDeployment,
    SquaddieDeploymentService,
} from "./squaddieDeployment"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { isValidValue } from "../utils/objectValidityCheck"

export interface MissionMap {
    playerDeployment: SquaddieDeployment
    terrainTileMap: TerrainTileMap
    squaddieInfo: MissionMapSquaddieCoordinate[]
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
        originMapCoordinate,
    }: {
        missionMap: MissionMap
        squaddieTemplateId: string
        battleSquaddieId: string
        originMapCoordinate?: HexCoordinate
    }): Error | undefined => {
        if (
            originMapCoordinate !== undefined &&
            !TerrainTileMapService.isCoordinateOnMap(
                missionMap.terrainTileMap,
                originMapCoordinate
            )
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${originMapCoordinate.q}, ${originMapCoordinate.r}) is not on map`
            )
        }

        const battleSquaddieWithId: MissionMapSquaddieCoordinate =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        if (battleSquaddieWithId) {
            return new Error(`${battleSquaddieId} already added`)
        }

        const squaddieAlreadyOccupyingCoordinate: MissionMapSquaddieCoordinate =
            getSquaddieAtCoordinate(missionMap, originMapCoordinate)
        if (
            MissionMapSquaddieCoordinateService.isValid(
                squaddieAlreadyOccupyingCoordinate
            ) &&
            !!originMapCoordinate
        ) {
            return new Error(
                `cannot add ${battleSquaddieId} to (${originMapCoordinate.q}, ${originMapCoordinate.r}), already occupied by ${squaddieAlreadyOccupyingCoordinate.battleSquaddieId}`
            )
        }

        missionMap.squaddieInfo.push({
            squaddieTemplateId,
            battleSquaddieId,
            currentMapCoordinate: originMapCoordinate,
            originMapCoordinate: originMapCoordinate,
        })
        return undefined
    },
    getByBattleSquaddieId: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ): MissionMapSquaddieCoordinate => {
        if (!isValidValue(missionMap)) {
            return {
                currentMapCoordinate: undefined,
                originMapCoordinate: undefined,
                squaddieTemplateId: undefined,
                battleSquaddieId: undefined,
            }
        }
        const foundDatum: MissionMapSquaddieCoordinate =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        return foundDatum
            ? MissionMapSquaddieCoordinateService.clone(foundDatum)
            : {
                  battleSquaddieId: undefined,
                  squaddieTemplateId: undefined,
                  originMapCoordinate: undefined,
                  currentMapCoordinate: undefined,
              }
    },
    updateBattleSquaddieCoordinate: ({
        missionMap,
        battleSquaddieId,
        coordinate,
    }: {
        missionMap: MissionMap
        battleSquaddieId: string
        coordinate: HexCoordinate
    }): Error | undefined => {
        const foundDatum: MissionMapSquaddieCoordinate =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )
        if (!foundDatum) {
            return new Error(
                `cannot update position for ${battleSquaddieId}, does not exist`
            )
        }

        if (
            coordinate &&
            !TerrainTileMapService.isCoordinateOnMap(
                missionMap.terrainTileMap,
                coordinate
            )
        ) {
            return new Error(
                `cannot update position for ${battleSquaddieId} to (${coordinate.q}, ${coordinate.r}) is not on map`
            )
        }

        if (coordinate) {
            const squaddieAtTheCoordinate = getSquaddieAtCoordinate(
                missionMap,
                coordinate
            )
            if (
                MissionMapSquaddieCoordinateService.isValid(
                    squaddieAtTheCoordinate
                ) &&
                squaddieAtTheCoordinate.battleSquaddieId !== battleSquaddieId
            ) {
                return new Error(
                    `cannot update position for ${battleSquaddieId} to (${coordinate.q}, ${coordinate.r}) already occupied by ${squaddieAtTheCoordinate.battleSquaddieId}`
                )
            }
        }

        foundDatum.currentMapCoordinate = coordinate
    },
    getBattleSquaddieAtCoordinate: (
        missionMap: MissionMap,
        coordinate: HexCoordinate
    ): MissionMapSquaddieCoordinate => {
        return getSquaddieAtCoordinate(missionMap, coordinate)
    },
    getSquaddiesThatHaveNoCoordinate: (missionMap: MissionMap) =>
        missionMap.squaddieInfo
            .filter((datum) => datum.currentMapCoordinate === undefined)
            .map((datum) => MissionMapSquaddieCoordinateService.clone(datum)),
    getAllSquaddieData: (missionMap: MissionMap) =>
        missionMap.squaddieInfo.map((datum) =>
            MissionMapSquaddieCoordinateService.clone(datum)
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
    setOriginMapCoordinateToCurrentMapCoordinate: (
        missionMap: MissionMap,
        battleSquaddieId: string
    ) => {
        if (!missionMap) return

        const foundDatum: MissionMapSquaddieCoordinate =
            missionMap.squaddieInfo.find(
                (datum) => datum.battleSquaddieId === battleSquaddieId
            )

        if (foundDatum && foundDatum.currentMapCoordinate) {
            foundDatum.originMapCoordinate.q = foundDatum.currentMapCoordinate.q
            foundDatum.originMapCoordinate.r = foundDatum.currentMapCoordinate.r
        }
    },
}

const getSquaddieAtCoordinate = (
    missionMap: MissionMap,
    coordinate: HexCoordinate
): MissionMapSquaddieCoordinate => {
    const foundDatum: MissionMapSquaddieCoordinate =
        missionMap.squaddieInfo.find(
            (datum) =>
                coordinate &&
                datum.currentMapCoordinate &&
                HexCoordinateService.areEqual(
                    datum.currentMapCoordinate,
                    coordinate
                )
        )
    return foundDatum
        ? MissionMapSquaddieCoordinateService.clone(foundDatum)
        : {
              battleSquaddieId: undefined,
              squaddieTemplateId: undefined,
              currentMapCoordinate: undefined,
              originMapCoordinate: undefined,
          }
}

const isSquaddieHiddenFromDrawing = (
    missionMap: MissionMap,
    battleSquaddieId: string
): boolean => {
    return missionMap.squaddiesHidden.includes(battleSquaddieId)
}
