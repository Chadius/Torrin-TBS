import {HEX_TILE_RADIUS, HEX_TILE_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ResourceHandler, ResourceHandlerService} from "../resource/resourceHandler";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertWorldCoordinatesToScreenCoordinates
} from "./convertCoordinates";
import {TerrainTileMap, TerrainTileMapService} from "./terrainTileMap";
import {BlendColor, calculatePulseValueOverTime, PulseBlendColor, pulseBlendColorToBlendColor} from "./colorUtils";
import {HexCoordinate} from "./hexCoordinate/hexCoordinate";
import {BattleCamera} from "../battle/battleCamera";
import {GraphicsBuffer} from "../utils/graphics/graphicsRenderer";
import {HexGridTile} from "./hexGrid";
import p5 from "p5";

export const HighlightPulseRedColor: PulseBlendColor = {
    hue: 0,
    saturation: 100,
    brightness: 100,
    lowAlpha: 140,
    highAlpha: 190,
    periodAlpha: 2000,
}

export const HighlightPulseBlueColor: PulseBlendColor = {
    hue: 240,
    saturation: 100,
    brightness: 100,
    lowAlpha: 140,
    highAlpha: 190,
    periodAlpha: 2000,
}

const defaultTerrainResourceKeyByTerrainType: { [key in HexGridMovementCost]: string } = {
    [HexGridMovementCost.singleMovement]: "map-tiles-basic-floor",
    [HexGridMovementCost.doubleMovement]: "map-tiles-basic-sand",
    [HexGridMovementCost.pit]: "map-tiles-basic-water",
    [HexGridMovementCost.wall]: "map-tiles-basic-wall",
}

const drawHexShape = (graphicsContext: GraphicsBuffer, worldX: number, worldY: number, cameraX: number, cameraY: number) => {
    let [screenDrawX, screenDrawY] = convertWorldCoordinatesToScreenCoordinates(worldX, worldY, cameraX, cameraY)

    graphicsContext.push();
    graphicsContext.translate(screenDrawX, screenDrawY);

    let angle = Math.PI / 3;
    graphicsContext.beginShape();
    const startAngle = Math.PI / 6;
    for (let a = 0; a < 6; a += 1) {
        let sx = Math.cos(startAngle + a * angle) * HEX_TILE_RADIUS;
        let sy = Math.sin(startAngle + a * angle) * HEX_TILE_RADIUS;
        graphicsContext.vertex(sx, sy);
    }
    graphicsContext.endShape("close");

    graphicsContext.pop();
};

const drawOutlinedTile = (
    graphicsContext: GraphicsBuffer,
    outlineTileCoordinates: HexCoordinate,
    cameraX: number,
    cameraY: number,
): void => {
    graphicsContext.push();
    graphicsContext.stroke(
        0,
        10,
        calculatePulseValueOverTime(50, 100, 2000)
    );
    graphicsContext.strokeWeight(2);
    graphicsContext.noFill();

    let xPos = (outlineTileCoordinates.r + outlineTileCoordinates.q * 0.5) * HEX_TILE_WIDTH
    let yPos = (outlineTileCoordinates.q * 0.866) * HEX_TILE_WIDTH
    drawHexShape(graphicsContext, xPos, yPos, cameraX, cameraY);
    graphicsContext.pop();
};

export const HexDrawingUtils = {
    drawHexMap: ({graphics, map, camera, resourceHandler}: {
        graphics: GraphicsBuffer,
        map: TerrainTileMap,
        camera: BattleCamera,
        resourceHandler: ResourceHandler
    }) => {
        const onScreenTiles = map.tiles.filter(tile => TerrainTileMapService.isTileOnScreen(map, tile.q, tile.r, camera))
        onScreenTiles.forEach(tile => {
            drawHexTileTerrain({graphics, tile, camera, resourceHandler})
        })

        const highlightedTiles = onScreenTiles.filter(tile => {
            const key = `${tile.q},${tile.r}`
            return !!(map.highlightedTiles[key])
        })
        highlightedTiles.forEach(tile => {
            const key = `${tile.q},${tile.r}`
            drawHexTileTerrainAndHighlight({
                graphics,
                tile,
                camera,
                resourceHandler,
                pulseBlendColor: map.highlightedTiles[key].pulseColor,
                overlayImageResourceKey: map.highlightedTiles[key].name
            })
        })

        if (map.outlineTileCoordinates !== undefined) {
            const {cameraX, cameraY} = camera.getCoordinatesAsObject()
            drawOutlinedTile(graphics, map.outlineTileCoordinates, cameraX, cameraY);
        }
    }
}

const drawHexTileTerrain = ({
                                graphics,
                                tile,
                                camera,
                                resourceHandler,
                            }: {
    graphics: GraphicsBuffer,
    tile: HexGridTile,
    camera: BattleCamera,
    resourceHandler: ResourceHandler
}) => {
    const imageResourceKey = defaultTerrainResourceKeyByTerrainType[tile.terrainType]
    const terrainImage = ResourceHandlerService.getResource(resourceHandler, imageResourceKey)
    drawHexTile({graphics, tile, camera, image: terrainImage})
}

const drawHexTileTerrainAndHighlight = ({
                                            graphics,
                                            tile,
                                            camera,
                                            resourceHandler,
                                            pulseBlendColor,
                                            overlayImageResourceKey,
                                        }: {
    graphics: GraphicsBuffer
    tile: HexGridTile
    camera: BattleCamera
    resourceHandler: ResourceHandler
    pulseBlendColor: PulseBlendColor
    overlayImageResourceKey?: string
}) => {
    const terrainImageResourceKey = defaultTerrainResourceKeyByTerrainType[tile.terrainType]
    const terrainImage = ResourceHandlerService.getResource(resourceHandler, terrainImageResourceKey)
    graphics.push()
    const blendColor: BlendColor = pulseBlendColorToBlendColor(pulseBlendColor);
    graphics.tint(blendColor[0], blendColor[1], blendColor[2], blendColor[3])
    drawHexTile({graphics, tile, camera, image: terrainImage})
    graphics.noTint()
    graphics.pop()

    if (overlayImageResourceKey === "" || overlayImageResourceKey === undefined) {
        return
    }

    const overlayImage = ResourceHandlerService.getResource(resourceHandler, overlayImageResourceKey)
    drawHexTile({graphics, tile, camera, image: overlayImage})
}

const drawHexTile = ({
                         graphics,
                         tile,
                         camera,
                         image,
                     }: {
    graphics: GraphicsBuffer
    tile: HexGridTile
    camera: BattleCamera
    image: p5.Image
}) => {
    const {cameraX, cameraY} = camera.getCoordinatesAsObject()
    let [screenX, screenY] = convertMapCoordinatesToScreenCoordinates(
        tile.q,
        tile.r,
        cameraX,
        cameraY
    )
    graphics.image(
        image,
        screenX - (image.width / 2),
        screenY - (image.height / 2)
    )
}
