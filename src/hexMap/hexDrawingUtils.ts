import * as p5 from "p5";
import {HEX_TILE_RADIUS, HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ResourceHandler} from "../resource/resourceHandler";
import {convertMapCoordinatesToWorldCoordinates} from "./convertCoordinates";
import {HexCoordinate, Integer} from "./hexGrid";
import {HexMap} from "./hexMap";
import {BlendColor, calculatePulseValueOverTime, PulseBlendColor, pulseBlendColorToBlendColor} from "./colorUtils";

type HexGridTerrainToColor = Record<HexGridMovementCost, number[]>

export const hexGridColorByTerrainType: HexGridTerrainToColor = {
  [HexGridMovementCost.singleMovement]: [41, 15, 40],
  [HexGridMovementCost.doubleMovement]: [57, 50, 45],
  [HexGridMovementCost.pit]: [209, 46, 40],
  [HexGridMovementCost.wall]: [355, 10, 13],
};

export const HighlightPulseRedColor: PulseBlendColor = {
  hue: 0,
  saturation: 80,
  brightness: 80,
  lowAlpha: 70,
  highAlpha: 90,
  periodAlpha: 2000,
}

export const HighlightPulseBlueColor: PulseBlendColor = {
  hue: 240,
  saturation: 80,
  brightness: 80,
  lowAlpha: 80,
  highAlpha: 90,
  periodAlpha: 2000,
}

type HexTileDrawOptions = {
  p: p5;
  q: Integer;
  r: Integer;
  terrainType: HexGridMovementCost;
  pulseColor?: PulseBlendColor;
  resourceHandler?: ResourceHandler;
  overlayImageResourceKey?: string;
}

export function drawHexTile(options: HexTileDrawOptions): void {
  const {
    p,
    q,
    r,
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
  p.push();

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

  p.stroke(strokeColor);
  p.strokeWeight(1);
  p.fill(fillColor)

  // See Axial Coordinates in:
  // https://www.redblobgames.com/grids/hexagons/
  // r applies the vector (1, 0)
  // q applies the vector (1/2, sqrt(3)/2)
  let xPos = r + q * 0.5
  let yPos = q * 0.866

  drawHexShape(p, xPos, yPos);

  if (overlayImageResourceKey && resourceHandler) {
    const imageOrError: p5.Image | Error = resourceHandler.getResource(overlayImageResourceKey);

    if (imageOrError instanceof p5.Image) {
      p.pop();

      let [xPos, yPos] = convertMapCoordinatesToWorldCoordinates(q, r);
      xPos += SCREEN_WIDTH / 2;
      yPos += SCREEN_HEIGHT / 2;
      p.push();
      p.translate(xPos, yPos);

      p.image(
        imageOrError,
        -imageOrError.width / 2,
        -imageOrError.height / 2,
      );

      p.pop();
    }
  }
  p.pop();
}

export function drawHexShape(p: p5, xPos: number, yPos: number) {
  xPos *= HEX_TILE_WIDTH;
  yPos *= HEX_TILE_WIDTH;

  xPos += SCREEN_WIDTH / 2;
  yPos += SCREEN_HEIGHT / 2;

  p.push();
  p.translate(xPos, yPos);

  let angle = Math.PI / 3;
  p.beginShape();
  const startAngle = Math.PI / 6;
  for (let a = 0; a < 6; a += 1) {
    let sx = Math.cos(startAngle + a * angle) * HEX_TILE_RADIUS;
    let sy = Math.sin(startAngle + a * angle) * HEX_TILE_RADIUS;
    p.vertex(sx, sy);
  }
  p.endShape("close");

  p.pop();
}

export function drawOutlinedTile(
  p: p5,
  outlineTileCoordinates: HexCoordinate
): void {
  p.push();

  const strokeColor = [
    0,
    10,
    calculatePulseValueOverTime(50, 100, 2000)
  ];

  p.stroke(strokeColor);
  p.strokeWeight(2);
  p.noFill();

  let xPos = outlineTileCoordinates.r + outlineTileCoordinates.q * 0.5
  let yPos = outlineTileCoordinates.q * 0.866
  drawHexShape(p, xPos, yPos);
  p.pop();
}

export function drawHexMap(p: p5, map: HexMap): void {
  map.tiles.forEach(
    (tile) => {
      const key = `${tile.q},${tile.r}`;
      if (map.highlightedTiles[key]) {
        drawHexTile({
          p: p,
          q: tile.q,
          r: tile.r,
          terrainType: tile.terrainType,
          pulseColor: map.highlightedTiles[key].pulseColor,
          resourceHandler: map.resourceHandler,
          overlayImageResourceKey: map.highlightedTiles[key].name
        });
      } else {
        drawHexTile({
          p: p,
          q: tile.q,
          r: tile.r,
          terrainType: tile.terrainType,
        });
      }
    }
  );

  if (map.outlineTileCoordinates !== undefined) {
    drawOutlinedTile(p, map.outlineTileCoordinates);
  }
}
