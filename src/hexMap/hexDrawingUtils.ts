import {
    HEX_TILE_HEIGHT,
    HEX_TILE_RADIUS,
    HEX_TILE_WIDTH,
} from "../graphicsConstants"
import { HexGridMovementCost, HexGridTile } from "./hexGridMovementCost"
import {
    ResourceHandler,
    ResourceHandlerService,
} from "../resource/resourceHandler"
import { ConvertCoordinateService } from "./convertCoordinates"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import {
    BlendColor,
    PULSE_COLOR_FORMULA_TYPE,
    PulseColor,
    PulseColorService,
} from "./pulseColor"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { BattleCamera } from "../battle/battleCamera"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import p5 from "p5"
import { TerrainTileGraphicsService } from "./terrainTileGraphics"
import { ScreenLocation } from "../utils/mouseConfig"

export enum HighlightPulseColorNames {
    PURPLE = "PURPLE",
    RED = "RED",
    BLUE = "BLUE",
    PALE_BLUE = "PALE_BLUE",
    GREEN = "GREEN",
}

export const HIGHLIGHT_PULSE_COLOR: {
    [color in HighlightPulseColorNames]: PulseColor
} = {
    PURPLE: PulseColorService.new({
        hue: 280,
        saturation: 30,
        brightness: 80,
        alpha: {
            low: 140,
            high: 190,
        },
        pulse: {
            period: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        },
    }),
    RED: PulseColorService.new({
        hue: 0,
        saturation: 100,
        brightness: 100,
        alpha: {
            low: 140,
            high: 190,
        },
        pulse: {
            period: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        },
    }),
    BLUE: PulseColorService.new({
        hue: 240,
        saturation: 100,
        brightness: 100,
        alpha: {
            low: 140,
            high: 190,
        },
        pulse: {
            period: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        },
    }),
    PALE_BLUE: PulseColorService.new({
        hue: 240,
        saturation: 30,
        brightness: 80,
        alpha: {
            low: 140,
            high: 190,
        },
        pulse: {
            period: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        },
    }),
    GREEN: PulseColorService.new({
        hue: 100,
        saturation: 80,
        brightness: 80,
        alpha: {
            low: 140,
            high: 190,
        },
        pulse: {
            period: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        },
    }),
}

const defaultTerrainResourceKeyByTerrainType: {
    [key in HexGridMovementCost]: string
} = {
    [HexGridMovementCost.singleMovement]: "map-tiles-basic-floor",
    [HexGridMovementCost.doubleMovement]: "map-tiles-basic-sand",
    [HexGridMovementCost.pit]: "map-tiles-basic-water",
    [HexGridMovementCost.wall]: "map-tiles-basic-wall",
}

const drawHexShape = (
    graphicsContext: GraphicsBuffer,
    mapCoordinate: HexCoordinate,
    cameraLocation: ScreenLocation
) => {
    let { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation,
        })

    graphicsContext.push()
    graphicsContext.translate(x + 1, y + 5)

    let angle = Math.PI / 3
    graphicsContext.beginShape()
    const startAngle = Math.PI / 6
    for (let a = 0; a < 6; a += 1) {
        let sx = Math.cos(startAngle + a * angle) * HEX_TILE_RADIUS
        let sy = Math.sin(startAngle + a * angle) * HEX_TILE_RADIUS
        graphicsContext.vertex(sx, sy)
    }
    graphicsContext.endShape("close")

    graphicsContext.pop()
}

const drawOutlinedTile = (
    graphicsContext: GraphicsBuffer,
    outlineTileCoordinates: HexCoordinate,
    cameraLocation: ScreenLocation
): void => {
    graphicsContext.push()
    graphicsContext.stroke(
        0,
        10,
        PulseColorService.calculatePulseAmount({
            range: {
                low: 50,
                high: 100,
            },
            periodInMilliseconds: 2000,
            formula: PULSE_COLOR_FORMULA_TYPE.SINE,
        })
    )
    graphicsContext.strokeWeight(2)
    graphicsContext.noFill()

    drawHexShape(graphicsContext, outlineTileCoordinates, cameraLocation)
    graphicsContext.pop()
}

export const HexDrawingUtils = {
    drawHighlightedTiles: ({
        graphics,
        map,
        camera,
    }: {
        graphics: GraphicsBuffer
        map: TerrainTileMap
        camera: BattleCamera
    }) => {
        const onScreenTiles: HexGridTile[] =
            TerrainTileGraphicsService.getAllOnscreenTerrainTiles({
                terrainTileMap: map,
                camera,
            })

        graphics.push()
        TerrainTileMapService.computeHighlightedTiles(map)
            .filter((highlight) =>
                onScreenTiles.find(
                    (onScreenTile) =>
                        onScreenTile.q === highlight.coordinate.q &&
                        onScreenTile.r === highlight.coordinate.r
                )
            )
            .forEach((highlight) => {
                const blendColor: BlendColor =
                    PulseColorService.pulseColorToColor(highlight.pulseColor)

                graphics.fill(
                    blendColor[0],
                    blendColor[1],
                    blendColor[2],
                    blendColor[3]
                )
                graphics.noStroke()
                let { x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: { ...highlight.coordinate },
                            cameraLocation: camera.getWorldLocation(),
                        }
                    )
                graphics.circle(x + 1, y + 3, HEX_TILE_WIDTH / 2)
            })
        graphics.pop()
    },
    drawMapTilesOntoImage: ({
        mapImage,
        terrainTileMap,
        resourceHandler,
    }: {
        mapImage: p5.Image
        terrainTileMap: TerrainTileMap
        resourceHandler: ResourceHandler
    }) =>
        drawMapTilesOntoImage({
            mapImage,
            terrainTileMap,
            resourceHandler,
        }),
    drawOutlinedTile: ({
        graphics,
        camera,
        map,
    }: {
        graphics: GraphicsBuffer
        camera: BattleCamera
        map: TerrainTileMap
    }) => {
        if (map.outlineTileCoordinates !== undefined) {
            drawOutlinedTile(
                graphics,
                map.outlineTileCoordinates,
                camera.getWorldLocation()
            )
        }
    },
    createMapImage: ({
        graphicsBuffer,
        terrainTileMap,
        resourceHandler,
    }: {
        graphicsBuffer: GraphicsBuffer
        terrainTileMap: TerrainTileMap
        resourceHandler: ResourceHandler
    }): p5.Image =>
        createMapImage({ graphicsBuffer, terrainTileMap, resourceHandler }),
    drawMapOnScreen: ({
        mapImage,
        screenGraphicsBuffer,
        camera,
    }: {
        mapImage: p5.Image
        screenGraphicsBuffer: GraphicsBuffer
        camera: BattleCamera
    }) => {
        let { x: centerOfTileX, y: centerOfTileY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 0 },
                cameraLocation: camera.getWorldLocation(),
            })

        screenGraphicsBuffer.image(
            mapImage,
            centerOfTileX - HEX_TILE_WIDTH / 2,
            centerOfTileY - HEX_TILE_HEIGHT / 2
        )
    },
}

const drawMapTilesOntoImage = ({
    mapImage,
    terrainTileMap,
    resourceHandler,
}: {
    mapImage: p5.Image
    terrainTileMap: TerrainTileMap
    resourceHandler: ResourceHandler
}) => {
    terrainTileMap.coordinates.forEach((hexGridTile) => {
        const imageResourceKey =
            defaultTerrainResourceKeyByTerrainType[hexGridTile.terrainType]
        const terrainImage = ResourceHandlerService.getResource(
            resourceHandler,
            imageResourceKey
        )
        let { x, y } =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { ...hexGridTile },
            })

        mapImage.copy(
            terrainImage,
            0,
            0,
            terrainImage.width,
            terrainImage.height,
            x,
            y,
            terrainImage.width,
            terrainImage.height
        )
    })
}

const createMapImage = ({
    graphicsBuffer,
    terrainTileMap,
    resourceHandler,
}: {
    graphicsBuffer: GraphicsBuffer
    terrainTileMap: TerrainTileMap
    resourceHandler: ResourceHandler
}): p5.Image => {
    const { widthOfWidestRow, numberOfRows } =
        TerrainTileMapService.getDimensions(terrainTileMap)

    let { x: mapPixelWidth, y: mapPixelHeight } =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
            mapCoordinate: {
                q: numberOfRows + 1,
                r: widthOfWidestRow + 1,
            },
        })

    const mapImage = graphicsBuffer.createImage(mapPixelWidth, mapPixelHeight)

    HexDrawingUtils.drawMapTilesOntoImage({
        mapImage,
        terrainTileMap,
        resourceHandler,
    })
    return mapImage
}
