import { HexGridTile } from "./hexGrid"
import {
    convertStringToMovementCost,
    HexGridMovementCost,
} from "./hexGridMovementCost"
import { PulseBlendColor } from "./colorUtils"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import {
    MapGraphicsLayer,
    MapGraphicsLayerHighlight,
    MapGraphicsLayerSquaddieTypes,
    MapGraphicsLayerType,
} from "./mapLayer/mapGraphicsLayer"

export type HighlightCoordinateDescription = {
    coordinates: HexCoordinate[]
    pulseColor: PulseBlendColor
    overlayImageResourceName?: string
}

export interface TerrainTileMap {
    coordinates: HexGridTile[]
    outlineTileCoordinates: HexCoordinate | undefined
    highlightLayers: MapGraphicsLayer[]
}

export const TerrainTileMapService = {
    new: ({ movementCost }: { movementCost: string[] }): TerrainTileMap => {
        return newTerrainTileMap({ movementCost })
    },
    getTileTerrainTypeAtCoordinate: (
        terrainTileMap: TerrainTileMap,
        coordinate: HexCoordinate
    ): HexGridMovementCost => {
        const tile = getTileAtCoordinate(terrainTileMap, coordinate)
        if (tile === undefined) {
            return undefined
        }
        return tile.terrainType
    },
    selectCoordinate({
        terrainTileMap,
        q,
        r,
    }: {
        terrainTileMap: TerrainTileMap
        q: number
        r: number
    }) {
        if (
            terrainTileMap.coordinates.some(
                (tile) => tile.q == q && tile.r == r
            )
        ) {
            terrainTileMap.outlineTileCoordinates = { q, r }
        } else {
            terrainTileMap.outlineTileCoordinates = undefined
        }
    },
    stopOutlineTiles: (terrainTileMap: TerrainTileMap): void => {
        terrainTileMap.outlineTileCoordinates = undefined
    },
    isCoordinateOnMap: (
        terrainTileMap: TerrainTileMap,
        hexCoordinate: HexCoordinate
    ): boolean =>
        hexCoordinate &&
        getTileAtCoordinate(terrainTileMap, hexCoordinate) !== undefined,
    getDimensions: (
        terrainTileMap: TerrainTileMap
    ): {
        widthOfWidestRow: number
        numberOfRows: number
    } => getDimensions(terrainTileMap),
    addGraphicsLayer: (
        terrainTileMap: TerrainTileMap,
        mapGraphicsLayer: MapGraphicsLayer
    ) => {
        removeGraphicsLayerWithIdAndType({
            terrainTileMap,
            id: mapGraphicsLayer.id,
            type: mapGraphicsLayer.type,
        })
        terrainTileMap.highlightLayers.push(mapGraphicsLayer)
    },
    getGraphicsLayer: ({
        terrainTileMap,
        id,
        type,
    }: {
        terrainTileMap: TerrainTileMap
        id: string
        type?: MapGraphicsLayerType
    }): MapGraphicsLayer => {
        return terrainTileMap.highlightLayers.find(
            (layer) =>
                layer.id === id && (type === undefined || layer.type === type)
        )
    },
    removeGraphicsLayerById: (
        terrainTileMap: TerrainTileMap,
        mapGraphicsLayerId: string
    ) => removeGraphicsLayerById(terrainTileMap, mapGraphicsLayerId),
    removeAllGraphicsLayers: (terrainTileMap: TerrainTileMap) => {
        terrainTileMap.highlightLayers = []
    },
    computeHighlightedTiles: (
        terrainTileMap: TerrainTileMap
    ): MapGraphicsLayerHighlight[] => {
        const highlightsByCoordinateKey: {
            [coordinateKey: string]: MapGraphicsLayerHighlight
        } = {}

        terrainTileMap.highlightLayers.forEach((layer) =>
            layer.highlights.forEach((highlight) => {
                const key: string = `${highlight.coordinate.q},${highlight.coordinate.r}`
                highlightsByCoordinateKey[key] = highlight
            })
        )

        return Object.values(highlightsByCoordinateKey)
    },
    removeGraphicsLayerByType: (
        terrainTileMap: TerrainTileMap,
        type: MapGraphicsLayerType
    ) => {
        terrainTileMap.highlightLayers = terrainTileMap.highlightLayers.filter(
            (map) => map.type !== type
        )
    },
    removeGraphicsLayerWithIdAndType: ({
        terrainTileMap,
        id,
        type,
    }: {
        terrainTileMap: TerrainTileMap
        id: string
        type: MapGraphicsLayerType
    }) =>
        removeGraphicsLayerWithIdAndType({
            terrainTileMap,
            id,
            type,
        }),
    sortGraphicsLayersByType: (terrainTileMap: TerrainTileMap) => {
        const sortByLayer = (a: MapGraphicsLayer, b: MapGraphicsLayer) => {
            const layerAIndex = MapGraphicsLayerSquaddieTypes.indexOf(a.type)
            const layerBIndex = MapGraphicsLayerSquaddieTypes.indexOf(b.type)

            switch (true) {
                case a.type === MapGraphicsLayerType.UNKNOWN &&
                    b.type !== MapGraphicsLayerType.UNKNOWN:
                    return -1
                case a.type !== MapGraphicsLayerType.UNKNOWN &&
                    b.type === MapGraphicsLayerType.UNKNOWN:
                    return 1
                case a.type === MapGraphicsLayerType.UNKNOWN &&
                    b.type === MapGraphicsLayerType.UNKNOWN:
                    return 0
                case layerAIndex < layerBIndex:
                    return -1
                case layerAIndex > layerBIndex:
                    return 1
                default:
                    return 0
            }
        }

        terrainTileMap.highlightLayers.sort(sortByLayer)
    },
    getMaximumDistance: (terrainTileMap: TerrainTileMap) =>
        TerrainTileMapService.getDimensions(terrainTileMap).widthOfWidestRow +
        TerrainTileMapService.getDimensions(terrainTileMap).numberOfRows,
    getTileAtCoordinate: (
        terrainTileMap: TerrainTileMap,
        hexCoordinate: HexCoordinate
    ) => getTileAtCoordinate(terrainTileMap, hexCoordinate),
}

const convertMovementCostToTiles = (movementCost: string[]): HexGridTile[] => {
    const newTiles: HexGridTile[] = []
    movementCost.forEach((costString, qIndex) => {
        let rIndex = 0 - Math.floor(qIndex / 2)
        if (qIndex % 2 !== costString.length % 2) {
            throw new Error(
                `movementCost validation failed: row ${qIndex} ` +
                    `must have ${qIndex % 2 === 0 ? "even" : "odd"} length,` +
                    `but is ${costString.length}`
            )
        }
        let costStringIndex = costString.length % 2 === 0 ? 0 : 1

        while (costStringIndex < costString.length) {
            let stringToConvert = costString.slice(
                costStringIndex,
                costStringIndex + 2
            )
            let movementCostType = convertStringToMovementCost(stringToConvert)
            newTiles.push({
                q: qIndex,
                r: rIndex,
                terrainType: movementCostType,
            })

            rIndex += 1
            costStringIndex += 2
        }
    })
    return newTiles
}

const getTileAtCoordinate = (
    terrainTileMap: TerrainTileMap,
    hexCoordinate: HexCoordinate
): HexGridTile | undefined =>
    terrainTileMap?.coordinates.find(
        (tile) => tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
    )

const newTerrainTileMap = ({
    movementCost,
}: {
    movementCost?: string[]
}): TerrainTileMap => {
    let tiles: HexGridTile[] = convertMovementCostToTiles(movementCost)
    tiles = [...tiles].sort((a, b) => {
        if (a.q < b.q) {
            return -1
        }
        if (a.q > b.q) {
            return 1
        }

        if (a.r < b.r) {
            return -1
        }
        if (a.r > b.r) {
            return 1
        }
        return 0
    })
    return {
        coordinates: tiles,
        outlineTileCoordinates: undefined,
        highlightLayers: [],
    }
}

const getDimensions = (
    terrainTileMap: TerrainTileMap
): {
    widthOfWidestRow: number
    numberOfRows: number
} => {
    let rowIndecies: { [row in number]: boolean } = {}
    terrainTileMap.coordinates.forEach((tile) => {
        rowIndecies[tile.q] = true
    })
    let numberOfRows: number = Object.keys(rowIndecies).length

    let widthOfWidestRow: number = 0
    terrainTileMap.coordinates.forEach((tile) => {
        if (tile.r + 1 > widthOfWidestRow) {
            widthOfWidestRow = tile.r + 1
        }
    })

    return {
        widthOfWidestRow,
        numberOfRows,
    }
}

const removeGraphicsLayerById = (
    terrainTileMap: TerrainTileMap,
    mapGraphicsLayerId: string
) => {
    terrainTileMap.highlightLayers = terrainTileMap.highlightLayers.filter(
        (layer) => layer.id !== mapGraphicsLayerId
    )
}

const removeGraphicsLayerWithIdAndType = ({
    terrainTileMap,
    id,
    type,
}: {
    terrainTileMap: TerrainTileMap
    id: string
    type: MapGraphicsLayerType
}) => {
    terrainTileMap.highlightLayers = terrainTileMap.highlightLayers.filter(
        (map) => map.type !== type || map.id !== id
    )
}
