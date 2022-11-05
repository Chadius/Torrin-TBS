import * as p5 from "p5";
import {HEX_TILE_RADIUS, HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "./graphicsConstants";

export function drawHexShape(p: p5, xPos: any, yPos: number) {
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

export function calculatePulseValueOverTime(low: number, high: number, periodInMilliseconds: number) {
  const d = new Date();
  const millisecondsSinceEpoch = d.getTime();

  const base = (high + low) / 2;
  const amplitude = (high - low) / 2;

  return Math.sin(
    millisecondsSinceEpoch * (Math.PI * 2) / periodInMilliseconds
  ) * amplitude + base;
}
