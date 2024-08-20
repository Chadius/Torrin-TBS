import { HexGridTile } from "./hexGrid"
import {
    convertStringToMovementCost,
    HexGridMovementCost,
} from "./hexGridMovementCost"
import {
    ConvertCoordinateService,
    convertScreenCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates,
    convertWorldCoordinatesToScreenCoordinates,
} from "./convertCoordinates"
import { ResourceHandler } from "../resource/resourceHandler"
import { PulseBlendColor } from "./colorUtils"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../missionMap/mapSearchDataLayer"
import { MouseButton } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { MapGraphicsLayer } from "./mapGraphicsLayer"

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
    highlightedTiles: {
        [coordinateKey: string]: {
            pulseColor: PulseBlendColor
            name: string
        }
    }
}

export const TerrainTileMapService = {
    new: ({ movementCost }: { movementCost: string[] }): TerrainTileMap => {
        return newTerrainTileMap({ movementCost })
    },
    createMapLayerForVisitableTiles: ({
        canPassThroughWalls,
        canCrossOverPits,
        terrainTileMap,
    }: {
        canPassThroughWalls: boolean
        canCrossOverPits: boolean
        terrainTileMap: TerrainTileMap
    }): MapSearchDataLayer => {
        const initialValueFill = (q: number, r: number): boolean | number => {
            const terrainType = getTileTerrainTypeAtLocation(
                terrainTileMap,
                q,
                r
            )
            switch (terrainType) {
                case HexGridMovementCost.singleMovement:
                case HexGridMovementCost.doubleMovement:
                    return false
                case HexGridMovementCost.pit:
                    return canCrossOverPits ? false : undefined
                case HexGridMovementCost.wall:
                    return canPassThroughWalls ? false : undefined
                default:
                    return undefined
            }
        }

        return MapSearchDataLayerService.new({
            terrainTileMap,
            initialValue: initialValueFill,
        })
    },
    createMapLayerForStoppableTiles: ({
        terrainTileMap,
    }: {
        terrainTileMap: TerrainTileMap
    }): MapSearchDataLayer => {
        const initialValueFill = (q: number, r: number): boolean | number => {
            const terrainType = getTileTerrainTypeAtLocation(
                terrainTileMap,
                q,
                r
            )
            switch (terrainType) {
                case HexGridMovementCost.singleMovement:
                case HexGridMovementCost.doubleMovement:
                    return false
                case HexGridMovementCost.pit:
                case HexGridMovementCost.wall:
                default:
                    return undefined
            }
        }

        return MapSearchDataLayerService.new({
            terrainTileMap,
            initialValue: initialValueFill,
        })
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
    getWorldLocation: (
        terrainTileMap: TerrainTileMap,
        q: number,
        r: number
    ): { x: number; y: number } => {
        const dimensions = getDimensions(terrainTileMap)

        if (
            q < 0 ||
            q > dimensions.numberOfRows ||
            r < 0 ||
            r > dimensions.widthOfWidestRow
        ) {
            return {
                x: undefined,
                y: undefined,
            }
        }

        const tile = getTileAtLocation(terrainTileMap, { q, r })
        if (tile === undefined) {
            return {
                x: undefined,
                y: undefined,
            }
        }

        return {
            x: tile.worldLocation.x,
            y: tile.worldLocation.y,
        }
    },
    getWorldBoundingBox: (
        terrainTileMap: TerrainTileMap
    ): { width: number; height: number } => {
        const terrainTileMapDimensions = getDimensions(terrainTileMap)
        const dimensionsConvertedToWorldWithBuffer =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                terrainTileMapDimensions.numberOfRows + 1,
                terrainTileMapDimensions.widthOfWidestRow + 1
            )

        return {
            width: dimensionsConvertedToWorldWithBuffer[0],
            height: dimensionsConvertedToWorldWithBuffer[1],
        }
    },
    isTileOnScreen: (
        terrainTileMap: TerrainTileMap,
        q: number,
        r: number,
        camera: BattleCamera
    ): boolean => {
        const hexGridTile = getTileAtLocation(terrainTileMap, { q, r })
        const tileScreenCoordinates =
            convertWorldCoordinatesToScreenCoordinates(
                hexGridTile.worldLocation.x,
                hexGridTile.worldLocation.y,
                ...camera.getCoordinates()
            )

        const horizontallyOnScreen =
            tileScreenCoordinates[0] + HEX_TILE_WIDTH >= 0 &&
            tileScreenCoordinates[0] - HEX_TILE_WIDTH <=
                ScreenDimensions.SCREEN_WIDTH

        const verticallyOnScreen =
            tileScreenCoordinates[1] + HEX_TILE_WIDTH >= 0 &&
            tileScreenCoordinates[1] - HEX_TILE_WIDTH <=
                ScreenDimensions.SCREEN_HEIGHT

        return horizontallyOnScreen && verticallyOnScreen
    },
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
        const [worldX, worldY] = convertScreenCoordinatesToWorldCoordinates(
            mouseX,
            mouseY,
            cameraX,
            cameraY
        )
        const tileCoordinates = convertWorldCoordinatesToMapCoordinates(
            worldX,
            worldY
        )

        if (
            terrainTileMap.tiles.some(
                (tile) =>
                    tile.q == tileCoordinates[0] && tile.r == tileCoordinates[1]
            )
        ) {
            terrainTileMap.outlineTileCoordinates = {
                q: tileCoordinates[0],
                r: tileCoordinates[1],
            }
        } else {
            terrainTileMap.outlineTileCoordinates = undefined
        }
    },
    highlightTiles(
        terrainTileMap: TerrainTileMap,
        highlightTileDescriptions: HighlightTileDescription[]
    ): void {
        terrainTileMap.highlightedTiles = {}
        highlightTileDescriptions.reverse().forEach((tileDesc) => {
            tileDesc.tiles.forEach((tile) => {
                const key = `${tile.q},${tile.r}`
                terrainTileMap.highlightedTiles[key] = {
                    pulseColor: tileDesc.pulseColor,
                    name: tileDesc.overlayImageResourceName,
                }
            })
        })
    },
    stopHighlightingTiles: (terrainTileMap: TerrainTileMap): void => {
        terrainTileMap.highlightedTiles = {}
    },
    stopOutlineTiles: (terrainTileMap: TerrainTileMap): void => {
        terrainTileMap.outlineTileCoordinates = undefined
    },
    getTileAtLocation: (
        terrainTileMap: TerrainTileMap,
        hexCoordinate: HexCoordinate
    ): HexGridTile | undefined =>
        getTileAtLocation(terrainTileMap, hexCoordinate),
    areCoordinatesOnMap: (
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
    // TODO add GraphicsLayer
    // TODO remove GraphicsLayer
    // TODO remove all GraphicsLayers
    addGraphicsLayer: (
        terrainTileMap: TerrainTileMap,
        mapGraphicsLayer: MapGraphicsLayer,
        id: string
    ) => {},
    // TODO Turn terrain map into an interface
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
                    x: worldLocation[0],
                    y: worldLocation[1],
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
    terrainTileMap &&
    terrainTileMap.tiles.find(
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
        highlightedTiles: {},
    }
}

const getTileTerrainTypeAtLocation = (
    terrainTileMap: TerrainTileMap,
    q: number,
    r: number
): HexGridMovementCost => {
    const tile = getTileAtLocation(terrainTileMap, { q, r })
    if (tile === undefined) {
        return undefined
    }
    return tile.terrainType
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
