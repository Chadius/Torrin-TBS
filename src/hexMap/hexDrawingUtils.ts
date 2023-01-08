import * as p5 from "p5";
import {HEX_TILE_RADIUS, HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {HexGridTerrainTypes} from "./hexGridTerrainType";

type HexGridTerrainToColor = Record<HexGridTerrainTypes, number[]>

export const hexGridColorByTerrainType: HexGridTerrainToColor = {
  [HexGridTerrainTypes.grass]: [117, 50, 33],
  [HexGridTerrainTypes.sand]: [57, 50, 45],
  [HexGridTerrainTypes.stone]: [355, 10, 13],
  [HexGridTerrainTypes.water]: [209, 46, 40],
  [HexGridTerrainTypes.floor]: [41, 15, 40],
};

export type BlendColor = [number,number,number,number];

export type PulseBlendColor = {
  hue: number,
  saturation: number,
  brightness: number,
  lowAlpha: number,
  highAlpha: number,
  periodAlpha: number,
};

export function pulseBlendColorToBlendColor(pulse: PulseBlendColor): BlendColor {
  return [
    pulse.hue,
    pulse.saturation,
    pulse.brightness,
    calculatePulseValueOverTime(
      pulse.lowAlpha,
      pulse.highAlpha,
      pulse.periodAlpha,
    )
  ] as BlendColor;
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

export function calculatePulseValueOverTime(low: number, high: number, periodInMilliseconds: number): number {
  const millisecondsSinceEpoch = Date.now();

  const base = (high + low) / 2;
  const amplitude = (high - low) / 2;

  return Math.sin(
    millisecondsSinceEpoch * (Math.PI * 2) / periodInMilliseconds
  ) * amplitude + base;
}

