import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";

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

export const convertWorldCoordinatesToScreenCoordinates = (
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number
):  [number, number] => {
  const screenX: number = worldX - cameraX + SCREEN_WIDTH/2;
  const screenY: number = worldY - cameraY + SCREEN_HEIGHT/2;

  return [screenX, screenY]
}

export const convertScreenCoordinatesToWorldCoordinates = (
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number
):  [number, number] => {
  const worldX = screenX - SCREEN_WIDTH/2 + cameraX;
  const worldY = screenY - SCREEN_HEIGHT/2 + cameraY;

  return [worldX, worldY]
}

export const convertMapCoordinatesToScreenCoordinates = (
  q: number,
  r: number,
  cameraX: number,
  cameraY: number
):  [number, number] => {
  const worldCoordinates = convertMapCoordinatesToWorldCoordinates(q, r)
  return convertWorldCoordinatesToScreenCoordinates(...worldCoordinates, cameraX, cameraY)
}
