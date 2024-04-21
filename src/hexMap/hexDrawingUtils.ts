import {HEX_TILE_RADIUS, HEX_TILE_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ResourceHandler} from "../resource/resourceHandler";
import {
    convertMapCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToScreenCoordinates
} from "./convertCoordinates";
import {TerrainTileMap} from "./terrainTileMap";
import {BlendColor, calculatePulseValueOverTime, PulseBlendColor, pulseBlendColorToBlendColor} from "./colorUtils";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {HexCoordinate} from "./hexCoordinate/hexCoordinate";

type HexGridTerrainToColor = Record<HexGridMovementCost, number[]>

export const hexGridColorByTerrainType: HexGridTerrainToColor = {
    [HexGridMovementCost.singleMovement]: [41, 15, 40],
    [HexGridMovementCost.doubleMovement]: [57, 50, 60],
    [HexGridMovementCost.pit]: [209, 46, 40],
    [HexGridMovementCost.wall]: [355, 10, 13],
};

export const HighlightPulseRedColor: PulseBlendColor = {
    hue: 0,
    saturation: 80,
    brightness: 70,
    lowAlpha: 80,
    highAlpha: 90,
    periodAlpha: 2000,
}

export const HighlightPulseBlueColor: PulseBlendColor = {
    hue: 240,
    saturation: 80,
    brightness: 70,
    lowAlpha: 80,
    highAlpha: 90,
    periodAlpha: 2000,
}

type HexTileDrawOptions = {
    graphicsContext: GraphicsContext,
    q: number;
    r: number;
    terrainType: HexGridMovementCost;
    cameraX: number;
    cameraY: number;
    pulseColor?: PulseBlendColor;
    resourceHandler?: ResourceHandler;
    overlayImageResourceKey?: string;
}

export function drawHexTile(options: HexTileDrawOptions): void {
    const {
        graphicsContext,
        q,
        r,
        cameraX,
        cameraY,
        terrainType,
        pulseColor,
        resourceHandler,
        overlayImageResourceKey
    } = options;

    // blendColor is an optional fill/blend color, an array of 4 numbers:
    // - Hue (0-360)
    // - Saturation (0-100)
    // - Brightness (0-100)
    // - Blending factor (0 = no blending, 100 = override original color)
    graphicsContext.push();

    const appearanceFillColor = hexGridColorByTerrainType[terrainType];
    let fillColor;

    if (pulseColor) {
        const blendColor: BlendColor = pulseBlendColorToBlendColor(pulseColor);
        const appearanceColorWeight = 100 - blendColor[3];

        fillColor = [
            ((appearanceFillColor[0] * appearanceColorWeight) + (blendColor[0] * blendColor[3])) / 100,
            ((appearanceFillColor[1] * appearanceColorWeight) + (blendColor[1] * blendColor[3])) / 100,
            ((appearanceFillColor[2] * appearanceColorWeight) + (blendColor[2] * blendColor[3])) / 100,
        ]
    } else {
        fillColor = appearanceFillColor;
    }

    const strokeColor = [
        fillColor[0],
        10,
        10
    ];

    graphicsContext.stroke({hsb: strokeColor});
    graphicsContext.strokeWeight(1);
    graphicsContext.fill({hsb: fillColor})

    // See Axial Coordinates in:
    // https://www.redblobgames.com/grids/hexagons/
    // r applies the vector (1, 0)
    // q applies the vector (1/2, sqrt(3)/2)
    let worldX = r + q * 0.5
    let worldY = q * 0.866

    drawHexShape(graphicsContext, worldX, worldY, cameraX, cameraY);

    if (overlayImageResourceKey && resourceHandler) {
        const image = resourceHandler.getResource(overlayImageResourceKey);
        graphicsContext.pop();

        let [imageWorldX, imageWorldY] = convertMapCoordinatesToWorldCoordinates(q, r);
        let [screenDrawX, screenDrawY] = convertWorldCoordinatesToScreenCoordinates(imageWorldX, imageWorldY, cameraX, cameraY)
        graphicsContext.push();
        graphicsContext.translate(screenDrawX, screenDrawY);

        graphicsContext.image(
            image,
            -image.width / 2,
            -image.height / 2,
        );

        graphicsContext.pop();
    }
}

export function drawHexShape(graphicsContext: GraphicsContext, worldX: number, worldY: number, cameraX: number, cameraY: number) {
    worldX *= HEX_TILE_WIDTH;
    worldY *= HEX_TILE_WIDTH;

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
}

export function drawOutlinedTile(
    graphicsContext: GraphicsContext,
    outlineTileCoordinates: HexCoordinate,
    cameraX: number,
    cameraY: number,
): void {
    graphicsContext.push();

    const strokeColor = [
        0,
        10,
        calculatePulseValueOverTime(50, 100, 2000)
    ];

    graphicsContext.stroke({hsb: strokeColor});
    graphicsContext.strokeWeight(2);
    graphicsContext.noFill();

    let xPos = outlineTileCoordinates.r + outlineTileCoordinates.q * 0.5
    let yPos = outlineTileCoordinates.q * 0.866
    drawHexShape(graphicsContext, xPos, yPos, cameraX, cameraY);
    graphicsContext.pop();
}

export function drawHexMap(graphicsContext: GraphicsContext, map: TerrainTileMap, cameraX: number, cameraY: number): void {
    map.tiles.forEach(
        (tile) => {
            const key = `${tile.q},${tile.r}`;
            if (map.highlightedTiles[key]) {
                drawHexTile({
                    graphicsContext,
                    q: tile.q,
                    r: tile.r,
                    cameraX,
                    cameraY,
                    terrainType: tile.terrainType,
                    pulseColor: map.highlightedTiles[key].pulseColor,
                    resourceHandler: map.resourceHandler,
                    overlayImageResourceKey: map.highlightedTiles[key].name
                });
            } else {
                drawHexTile({
                    graphicsContext,
                    q: tile.q,
                    r: tile.r,
                    terrainType: tile.terrainType,
                    cameraX,
                    cameraY,
                });
            }
        }
    );

    if (map.outlineTileCoordinates !== undefined) {
        drawOutlinedTile(graphicsContext, map.outlineTileCoordinates, cameraX, cameraY);
    }
}
