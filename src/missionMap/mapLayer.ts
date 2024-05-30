import { MissionMap } from "./missionMap"
import { TerrainTileMap } from "../hexMap/terrainTileMap"

export interface MapLayer {
    numberOfRows: number
    widthOfWidestRow: number
    valueByLocation: {
        [q: number]: {
            [r: number]: boolean | number
        }
    }
}

export type MapCoordinateValueGenerator = (
    q: number,
    r: number
) => boolean | number

export const MapLayerHelper = {
    new: ({
        map,
        terrainTileMap,
        initialValue,
    }: {
        map?: MissionMap
        terrainTileMap?: TerrainTileMap
        initialValue: boolean | number | undefined | MapCoordinateValueGenerator
    }): MapLayer => {
        if (map) {
            terrainTileMap = map.terrainTileMap
        }

        const newMapLayer: MapLayer = {
            numberOfRows: terrainTileMap.getDimensions().numberOfRows,
            widthOfWidestRow: terrainTileMap.getDimensions().widthOfWidestRow,
            valueByLocation: {},
        }

        for (let q = 0; q < newMapLayer.numberOfRows; q++) {
            newMapLayer.valueByLocation[q] = {}
            for (let r = 0; r < newMapLayer.widthOfWidestRow; r++) {
                if (
                    initialValue === undefined ||
                    ["boolean", "number"].includes(typeof initialValue)
                ) {
                    newMapLayer.valueByLocation[q][r] = initialValue as
                        | number
                        | boolean
                        | undefined
                } else {
                    const initialValueFunction =
                        initialValue as MapCoordinateValueGenerator
                    newMapLayer.valueByLocation[q][r] = initialValueFunction(
                        q,
                        r
                    )
                }
            }
        }

        return newMapLayer
    },
    setValueOfLocation: ({
        mapLayer,
        q,
        r,
        value,
    }: {
        mapLayer: MapLayer
        q: number
        r: number
        value: boolean | number | undefined
    }) => {
        if (outOfBounds({ mapLayer, q, r })) {
            throw new Error(
                `(${q}, ${r}) is out of bounds, must be within (${mapLayer.numberOfRows}, ${mapLayer.widthOfWidestRow})`
            )
        }

        mapLayer.valueByLocation[q][r] = value
    },
    outOfBounds: ({
        mapLayer,
        q,
        r,
    }: {
        mapLayer: MapLayer
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
    mapLayer: MapLayer
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
