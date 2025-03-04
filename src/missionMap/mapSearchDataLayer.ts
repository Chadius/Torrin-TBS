import { MissionMap } from "./missionMap"
import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export interface MapSearchDataLayer {
    numberOfRows: number
    widthOfWidestRow: number
    valueByCoordinate: {
        [q: number]: {
            [r: number]: boolean | number
        }
    }
}

export type MapCoordinateValueGenerator = (
    q: number,
    r: number
) => boolean | number

export const MapSearchDataLayerService = {
    new: ({
        map,
        terrainTileMap,
        initialValue,
    }: {
        map?: MissionMap
        terrainTileMap?: TerrainTileMap
        initialValue: boolean | number | undefined | MapCoordinateValueGenerator
    }): MapSearchDataLayer => {
        if (map) {
            terrainTileMap = map.terrainTileMap
        }

        const newMapLayer: MapSearchDataLayer = {
            numberOfRows:
                TerrainTileMapService.getDimensions(terrainTileMap)
                    .numberOfRows,
            widthOfWidestRow:
                TerrainTileMapService.getDimensions(terrainTileMap)
                    .widthOfWidestRow,
            valueByCoordinate: {},
        }

        for (let q = 0; q < newMapLayer.numberOfRows; q++) {
            newMapLayer.valueByCoordinate[q] = {}
            for (let r = 0; r < newMapLayer.widthOfWidestRow; r++) {
                if (
                    initialValue === undefined ||
                    ["boolean", "number"].includes(typeof initialValue)
                ) {
                    newMapLayer.valueByCoordinate[q][r] = initialValue as
                        | number
                        | boolean
                        | undefined
                } else {
                    const initialValueFunction =
                        initialValue as MapCoordinateValueGenerator
                    newMapLayer.valueByCoordinate[q][r] = initialValueFunction(
                        q,
                        r
                    )
                }
            }
        }

        return newMapLayer
    },
    setValueOfCoordinate: ({
        mapLayer,
        mapCoordinate,
        value,
    }: {
        mapLayer: MapSearchDataLayer
        mapCoordinate: HexCoordinate
        value: boolean | number | undefined
    }) => {
        if (outOfBounds({ mapLayer, mapCoordinate })) {
            throw new Error(
                `(${mapCoordinate.q}, ${mapCoordinate.r}) is out of bounds, must be within (${mapLayer.numberOfRows}, ${mapLayer.widthOfWidestRow})`
            )
        }

        mapLayer.valueByCoordinate[mapCoordinate.q][mapCoordinate.r] = value
    },
    outOfBounds: ({
        mapLayer,
        mapCoordinate,
    }: {
        mapLayer: MapSearchDataLayer
        mapCoordinate: HexCoordinate
    }): boolean => {
        return outOfBounds({ mapLayer, mapCoordinate })
    },
}

const outOfBounds = ({
    mapLayer,
    mapCoordinate,
}: {
    mapLayer: MapSearchDataLayer
    mapCoordinate: HexCoordinate
}): boolean => {
    return (
        mapCoordinate.q < 0 ||
        mapCoordinate.q >= mapLayer.numberOfRows ||
        mapCoordinate.r < 0 ||
        mapCoordinate.r >= mapLayer.widthOfWidestRow
    )
}
