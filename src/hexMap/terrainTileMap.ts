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
import { MapLayer, MapLayerHelper } from "../missionMap/mapLayer"
import { MouseButton } from "../utils/mouseConfig"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"

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

export type HighlightTileDescription = {
    tiles: HexCoordinate[]
    pulseColor: PulseBlendColor
    overlayImageResourceName?: string
}

export class TerrainTileMap {
    tiles: HexGridTile[]
    outlineTileCoordinates: HexCoordinate | undefined
    resourceHandler: ResourceHandler

    constructor({
        movementCost,
        resourceHandler,
    }: {
        movementCost?: string[]
        resourceHandler?: ResourceHandler
    }) {
        let tiles: HexGridTile[] = convertMovementCostToTiles(movementCost)
        this.tiles = [...tiles].sort((a, b) => {
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
        this._highlightedTiles = {}

        this.resourceHandler = resourceHandler
    }

    private _highlightedTiles: {
        [coordinateKey: string]: {
            pulseColor: PulseBlendColor
            name: string
        }
    }

    get highlightedTiles(): {
        [p: string]: {
            pulseColor: PulseBlendColor
            name: string
        }
    } {
        return this._highlightedTiles
    }

    mouseClicked({
        mouseButton,
        mouseX,
        mouseY,
        cameraX,
        cameraY,
    }: {
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
            this.tiles.some(
                (tile) =>
                    tile.q == tileCoordinates[0] && tile.r == tileCoordinates[1]
            )
        ) {
            this.outlineTileCoordinates = {
                q: tileCoordinates[0],
                r: tileCoordinates[1],
            }
        } else {
            this.outlineTileCoordinates = undefined
        }
    }

    highlightTiles(
        highlightTileDescriptions: HighlightTileDescription[]
    ): void {
        this._highlightedTiles = {}
        highlightTileDescriptions.reverse().forEach((tileDesc) => {
            tileDesc.tiles.forEach((tile) => {
                const key = `${tile.q},${tile.r}`
                this._highlightedTiles[key] = {
                    pulseColor: tileDesc.pulseColor,
                    name: tileDesc.overlayImageResourceName,
                }
            })
        })
    }

    stopHighlightingTiles(): void {
        this._highlightedTiles = {}
    }

    stopOutlineTiles(): void {
        this.outlineTileCoordinates = undefined
    }

    getTileTerrainTypeAtLocation(
        hexCoordinate: HexCoordinate
    ): HexGridMovementCost | undefined {
        const tile = this.getTileAtLocation(hexCoordinate)
        if (tile === undefined) {
            return undefined
        }
        return tile.terrainType
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return (
            hexCoordinate && this.getTileAtLocation(hexCoordinate) !== undefined
        )
    }

    getDimensions(): {
        widthOfWidestRow: number
        numberOfRows: number
    } {
        let rowIndecies: { [row in number]: boolean } = {}
        this.tiles.forEach((tile) => {
            rowIndecies[tile.q] = true
        })
        let numberOfRows: number = Object.keys(rowIndecies).length

        let widthOfWidestRow: number = 0
        this.tiles.forEach((tile) => {
            if (tile.r + 1 > widthOfWidestRow) {
                widthOfWidestRow = tile.r + 1
            }
        })

        return {
            widthOfWidestRow,
            numberOfRows,
        }
    }

    getTileAtLocation(hexCoordinate: HexCoordinate): HexGridTile | undefined {
        return this.tiles.find(
            (tile) => tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
        )
    }
}

export const TerrainTileMapService = {
    new: ({ movementCost }: { movementCost: string[] }): TerrainTileMap => {
        return new TerrainTileMap({ movementCost })
    },
    createMapLayerForVisitableTiles: ({
        canPassThroughWalls,
        canCrossOverPits,
        terrainTileMap,
    }: {
        canPassThroughWalls: boolean
        canCrossOverPits: boolean
        terrainTileMap: TerrainTileMap
    }): MapLayer => {
        const initialValueFill = (q: number, r: number): boolean | number => {
            const terrainType = terrainTileMap.getTileTerrainTypeAtLocation({
                q,
                r,
            })
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

        return MapLayerHelper.new({
            terrainTileMap,
            initialValue: initialValueFill,
        })
    },
    createMapLayerForStoppableTiles: ({
        terrainTileMap,
    }: {
        terrainTileMap: TerrainTileMap
    }): MapLayer => {
        const initialValueFill = (q: number, r: number): boolean | number => {
            const terrainType = terrainTileMap.getTileTerrainTypeAtLocation({
                q,
                r,
            })
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

        return MapLayerHelper.new({
            terrainTileMap,
            initialValue: initialValueFill,
        })
    },
    getTileTerrainTypeAtLocation: (
        terrainTileMap: TerrainTileMap,
        q: number,
        r: number
    ): HexGridMovementCost => {
        const tile = terrainTileMap.getTileAtLocation({ q, r })
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
        const dimensions = terrainTileMap.getDimensions()

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

        const tile = terrainTileMap.getTileAtLocation({ q, r })
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
        const terrainTileMapDimensions = terrainTileMap.getDimensions()
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
        const hexGridTile = terrainTileMap.getTileAtLocation({ q, r })
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
}
