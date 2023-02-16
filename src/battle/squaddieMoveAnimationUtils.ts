import {
  convertMapCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToScreenCoordinates
} from "../hexMap/convertCoordinates";
import {TileFoundDescription} from "../hexMap/pathfinder/pathfinder";

export const lerpSquaddieBetweenPath = (
  movementPathInfo: TileFoundDescription[],
  timePassed: number,
  totalTravelTime: number,
  cameraX: number,
  cameraY: number,
) : [number,number] => {
  const startpoint = convertMapCoordinatesToWorldCoordinates(movementPathInfo[0].q, movementPathInfo[0].r)
  const endpoint = convertMapCoordinatesToWorldCoordinates(movementPathInfo[1].q, movementPathInfo[1].r)

  const lerpX: number = (
    endpoint[0]
    - startpoint[0]
  ) * timePassed / totalTravelTime + startpoint[0];
  const lerpY: number = (
    endpoint[1]
    - startpoint[1]
  ) * timePassed / totalTravelTime + startpoint[1];

  const xyCoords: [number, number] = convertWorldCoordinatesToScreenCoordinates(
    lerpX, lerpY, cameraX, cameraY)
  return xyCoords;
}
