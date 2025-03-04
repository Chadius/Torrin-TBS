import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { HexGridMovementCost } from "./hexGridMovementCost"
import {
    ResourceHandler,
    ResourceHandlerService,
} from "../resource/resourceHandler"
import { ConvertCoordinateService } from "./convertCoordinates"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import { BlendColor, ColorUtils, PulseBlendColor } from "./colorUtils"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { BattleCamera } from "../battle/battleCamera"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { HexGridTile } from "./hexGrid"
import p5 from "p5"
import { TerrainTileGraphicsService } from "./terrainTileGraphics"
import { ScreenLocation } from "../utils/mouseConfig"

export enum HighlightPulseColorNames {
    PURPLE = "PURPLE",
    RED = "RED",
    BLUE = "BLUE",
    PALE_BLUE = "PALE_BLUE",
}

export const HIGHLIGHT_PULSE_COLOR: {
    [color in HighlightPulseColorNames]: PulseBlendColor
} = {
    PURPLE: {
        hue: 280,
        saturation: 30,
        brightness: 80,
        lowAlpha: 140,
        highAlpha: 190,
        periodAlpha: 2000,
    },
    RED: {
        hue: 0,
        saturation: 100,
        brightness: 100,
        lowAlpha: 140,
        highAlpha: 190,
        periodAlpha: 2000,
    },
    BLUE: {
        hue: 240,
        saturation: 100,
        brightness: 100,
        lowAlpha: 140,
        highAlpha: 190,
        periodAlpha: 2000,
    },
    PALE_BLUE: {
        hue: 240,
        saturation: 30,
        brightness: 80,
        lowAlpha: 140,
        highAlpha: 190,
        periodAlpha: 2000,
    },
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
    worldLocation: ScreenLocation,
    cameraLocation: ScreenLocation
) => {
    let { x, y } =
        ConvertCoordinateService.convertWorldLocationToScreenLocation({
            worldLocation,
            cameraLocation,
        })

    graphicsContext.push()
    graphicsContext.translate(x, y)

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
        ColorUtils.calculatePulseValueOverTime({
            low: 50,
            high: 100,
            periodInMilliseconds: 2000,
        })
    )
    graphicsContext.strokeWeight(2)
    graphicsContext.noFill()

    let xPos =
        (outlineTileCoordinates.r + outlineTileCoordinates.q * 0.5) *
        HEX_TILE_WIDTH
    let yPos = (outlineTileCoordinates.q * 3 * HEX_TILE_RADIUS) / 2
    drawHexShape(graphicsContext, { x: xPos, y: yPos }, cameraLocation)
    graphicsContext.pop()
}

export const HexDrawingUtils = {
    drawHexMap: ({
        graphics,
        map,
        camera,
        resourceHandler,
    }: {
        graphics: GraphicsBuffer
        map: TerrainTileMap
        camera: BattleCamera
        resourceHandler: ResourceHandler
    }) => {
        const onScreenTiles: HexGridTile[] =
            TerrainTileGraphicsService.getAllOnscreenTerrainTiles({
                terrainTileMap: map,
                camera,
            })
        onScreenTiles.forEach((tile) => {
            drawHexTileTerrain({ graphics, tile, camera, resourceHandler })
        })

        TerrainTileMapService.computeHighlightedTiles(map)
            .filter((highlight) =>
                onScreenTiles.find(
                    (onScreenTile) =>
                        onScreenTile.q === highlight.coordinate.q &&
                        onScreenTile.r === highlight.coordinate.r
                )
            )
            .forEach((highlight) => {
                const terrainType = onScreenTiles.find(
                    (onScreenTile) =>
                        onScreenTile.q === highlight.coordinate.q &&
                        onScreenTile.r === highlight.coordinate.r
                ).terrainType

                drawHexTileTerrainAndHighlight({
                    graphics,
                    coordinate: highlight.coordinate,
                    terrainType,
                    camera,
                    resourceHandler,
                    pulseBlendColor: highlight.pulseColor,
                    overlayImageResourceKey: highlight.overlayImageResourceName,
                })
            })

        if (map.outlineTileCoordinates !== undefined) {
            drawOutlinedTile(
                graphics,
                map.outlineTileCoordinates,
                camera.getWorldLocation()
            )
        }
    },
}

const drawHexTileTerrain = ({
    graphics,
    tile,
    camera,
    resourceHandler,
}: {
    graphics: GraphicsBuffer
    tile: HexGridTile
    camera: BattleCamera
    resourceHandler: ResourceHandler
}) => {
    const imageResourceKey =
        defaultTerrainResourceKeyByTerrainType[tile.terrainType]
    const terrainImage = ResourceHandlerService.getResource(
        resourceHandler,
        imageResourceKey
    )
    drawHexTile({
        graphics,
        coordinate: { q: tile.q, r: tile.r },
        camera,
        image: terrainImage,
    })
}

const drawHexTileTerrainAndHighlight = ({
    graphics,
    terrainType,
    coordinate,
    camera,
    resourceHandler,
    pulseBlendColor,
    overlayImageResourceKey,
}: {
    graphics: GraphicsBuffer
    terrainType: HexGridMovementCost
    coordinate: HexCoordinate
    camera: BattleCamera
    resourceHandler: ResourceHandler
    pulseBlendColor: PulseBlendColor
    overlayImageResourceKey?: string
}) => {
    const terrainImage = ResourceHandlerService.getResource(
        resourceHandler,
        defaultTerrainResourceKeyByTerrainType[terrainType]
    )
    graphics.push()
    const blendColor: BlendColor =
        ColorUtils.pulseBlendColorToBlendColor(pulseBlendColor)
    graphics.tint(blendColor[0], blendColor[1], blendColor[2], blendColor[3])
    drawHexTile({
        graphics,
        coordinate: coordinate,
        camera,
        image: terrainImage,
    })
    graphics.noTint()
    graphics.pop()

    if (
        overlayImageResourceKey === "" ||
        overlayImageResourceKey === undefined
    ) {
        return
    }

    const overlayImage = ResourceHandlerService.getResource(
        resourceHandler,
        overlayImageResourceKey
    )
    drawHexTile({
        graphics,
        coordinate: coordinate,
        camera,
        image: overlayImage,
    })
}

const drawHexTile = ({
    graphics,
    coordinate,
    camera,
    image,
}: {
    graphics: GraphicsBuffer
    coordinate: HexCoordinate
    camera: BattleCamera
    image: p5.Image
}) => {
    let { x, y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: coordinate,
            cameraLocation: camera.getWorldLocation(),
        })
    graphics.image(image, x - image.width / 2, y - image.height / 2)
}
