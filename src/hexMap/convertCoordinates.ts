import {HEX_TILE_WIDTH} from "../graphicsConstants";

export const convertWorldCoordinatesToMapCoordinates = (worldX: number, worldY: number): [number, number] => {
  const xScaled = worldX / HEX_TILE_WIDTH;
  const yScaled = worldY / HEX_TILE_WIDTH;

  // q = 2 * yScaled / sqrt(3)
  const q = yScaled * 1.154;

  // r = x - (y / sqrt(3))
  const r = xScaled - (yScaled / 1.732);

  return [Math.round(q), Math.round(r)];
}

export const convertMapCoordinatesToWorldCoordinates = (q: number, r: number): [number, number] => {
  const y = q * Math.sqrt(3) / 2;
  const x = r + q / 2;
  return [x * HEX_TILE_WIDTH, y * HEX_TILE_WIDTH];
}
