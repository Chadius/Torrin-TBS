import { HexGridTile } from "./hexGrid"
import {
    convertStringToMovementCost,
    HexGridMovementCost,
} from "./hexGridMovementCost"
import { ConvertCoordinateService } from "./convertCoordinates"
import { ResourceHandler } from "../resource/resourceHandler"
import { PulseBlendColor } from "./colorUtils"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { MouseButton } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import {
    MapGraphicsLayer,
    MapGraphicsLayerHighlight,
    MapGraphicsLayerSquaddieTypes,
    MapGraphicsLayerType,
} from "./mapGraphicsLayer"

export type HighlightTileDescription = {
    tiles: HexCoordinate[]
    pulseColor: PulseBlendColor
    overlayImageResourceName?: string
}

export interface TerrainTileMap {
    tiles: HexGridTile[]
    outlineTileCoordinates: HexCoordinate | undefined
    resourceHandler: ResourceHandler
    highlightLayers: MapGraphicsLayer[]
}

export const TerrainTileMapService = {
    new: ({ movementCost }: { movementCost: string[] }): TerrainTileMap => {
        return newTerrainTileMap({ movementCost })
    },
    getTileTerrainTypeAtLocation: (
        terrainTileMap: TerrainTileMap,
        location: HexCoordinate
    ): HexGridMovementCost => {
        const tile = getTileAtLocation(terrainTileMap, location)
        if (tile === undefined) {
            return undefined
        }
        return tile.terrainType
    },
    isLocationOnScreen: ({
        terrainTileMap,
        location,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        location: HexCoordinate
        camera: BattleCamera
    }): boolean =>
        isLocationOnScreen({
            terrainTileMap,
            location,
            camera,
        }),
    getAllOnscreenLocations: ({
        terrainTileMap,
        camera,
    }: {
        terrainTileMap: TerrainTileMap
        camera: BattleCamera
    }): HexGridTile[] =>
        terrainTileMap.tiles.filter((tile) =>
            isLocationOnScreen({
                terrainTileMap,
                location: tile,
                camera,
            })
        ),
    mouseClicked({
        terrainTileMap,
        mouseButton,
        mouseX,
        mouseY,
        cameraX,
        cameraY,
    }: {
        terrainTileMap: TerrainTileMap
        mouseButton: MouseButton
        mouseX: number
        mouseY: number
        cameraX: number
        cameraY: number
    }) {
        const { q, r } =
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
                screenX: mouseX,
                screenY: mouseY,
                cameraX,
                cameraY,
            })

        if (terrainTileMap.tiles.some((tile) => tile.q == q && tile.r == r)) {
            terrainTileMap.outlineTileCoordinates = { q, r }
        } else {
            terrainTileMap.outlineTileCoordinates = undefined
        }
    },
    stopOutlineTiles: (terrainTileMap: TerrainTileMap): void => {
        terrainTileMap.outlineTileCoordinates = undefined
    },
    getTileAtLocation: (
        terrainTileMap: TerrainTileMap,
        hexCoordinate: HexCoordinate
    ): HexGridTile | undefined =>
        getTileAtLocation(terrainTileMap, hexCoordinate),
    isLocationOnMap: (
        terrainTileMap: TerrainTileMap,
        hexCoordinate: HexCoordinate
    ): boolean =>
        hexCoordinate &&
        getTileAtLocation(terrainTileMap, hexCoordinate) !== undefined,
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
        const highlightsByLocationKey: {
            [locationKey: string]: MapGraphicsLayerHighlight
        } = {}

        terrainTileMap.highlightLayers.forEach((layer) =>
            layer.highlights.forEach((highlight) => {
                const key: string = `${highlight.location.q},${highlight.location.r}`
                highlightsByLocationKey[key] = highlight
            })
        )

        return Object.values(highlightsByLocationKey)
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
            const worldLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    qIndex,
                    rIndex
                )
            newTiles.push({
                q: qIndex,
                r: rIndex,
                terrainType: movementCostType,
                worldLocation: {
                    x: worldLocation.worldX,
                    y: worldLocation.worldY,
                },
            })

            rIndex += 1
            costStringIndex += 2
        }
    })
    return newTiles
}

const getTileAtLocation = (
    terrainTileMap: TerrainTileMap,
    hexCoordinate: HexCoordinate
): HexGridTile | undefined =>
    terrainTileMap?.tiles.find(
        (tile) => tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
    )

const newTerrainTileMap = ({
    movementCost,
    resourceHandler,
}: {
    movementCost?: string[]
    resourceHandler?: ResourceHandler
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
        tiles,
        outlineTileCoordinates: undefined,
        resourceHandler,
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
    terrainTileMap.tiles.forEach((tile) => {
        rowIndecies[tile.q] = true
    })
    let numberOfRows: number = Object.keys(rowIndecies).length

    let widthOfWidestRow: number = 0
    terrainTileMap.tiles.forEach((tile) => {
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

const isLocationOnScreen = ({
    terrainTileMap,
    location,
    camera,
}: {
    terrainTileMap: TerrainTileMap
    location: HexCoordinate
    camera: BattleCamera
}): boolean => {
    const hexGridTile = getTileAtLocation(terrainTileMap, location)
    const tileScreenCoordinates =
        ConvertCoordinateService.convertWorldCoordinatesToScreenCoordinates({
            worldX: hexGridTile.worldLocation.x,
            worldY: hexGridTile.worldLocation.y,
            ...camera.getCoordinates(),
        })

    const horizontallyOnScreen =
        tileScreenCoordinates.screenX + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.screenX - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_WIDTH

    const verticallyOnScreen =
        tileScreenCoordinates.screenY + HEX_TILE_WIDTH >= 0 &&
        tileScreenCoordinates.screenY - HEX_TILE_WIDTH <=
            ScreenDimensions.SCREEN_HEIGHT

    return horizontallyOnScreen && verticallyOnScreen
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
