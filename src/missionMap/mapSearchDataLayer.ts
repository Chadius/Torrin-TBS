import { MissionMap } from "./missionMap"
import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"

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
        q,
        r,
        value,
    }: {
        mapLayer: MapSearchDataLayer
        q: number
        r: number
        value: boolean | number | undefined
    }) => {
        if (outOfBounds({ mapLayer, q, r })) {
            throw new Error(
                `(${q}, ${r}) is out of bounds, must be within (${mapLayer.numberOfRows}, ${mapLayer.widthOfWidestRow})`
            )
        }

        mapLayer.valueByCoordinate[q][r] = value
    },
    outOfBounds: ({
        mapLayer,
        q,
        r,
    }: {
        mapLayer: MapSearchDataLayer
        q: number
        r: number
    }): boolean => {
        return outOfBounds({ mapLayer, q, r })
    },
}

const outOfBounds = ({
    mapLayer,
    q,
    r,
}: {
    mapLayer: MapSearchDataLayer
    q: number
    r: number
}): boolean => {
    return (
        q < 0 ||
        q >= mapLayer.numberOfRows ||
        r < 0 ||
        r >= mapLayer.widthOfWidestRow
    )
}
