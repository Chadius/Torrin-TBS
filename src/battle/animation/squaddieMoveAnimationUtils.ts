import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToScreenCoordinates
} from "../../hexMap/convertCoordinates";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {BattleCamera} from "../battleCamera";

export const TIME_TO_MOVE = 1000.0;

export const getSquaddiePositionAlongPath = (
    tilesTraveled: TileFoundDescription[],
    timePassed: number,
    timeToMove: number,
    camera: BattleCamera,
): [number, number] => {
    if (timePassed < 0) {
        return convertMapCoordinatesToScreenCoordinates(
            tilesTraveled[0].q,
            tilesTraveled[0].r,
            ...camera.getCoordinates()
        );
    }
    if (timePassed > timeToMove) {
        return convertMapCoordinatesToScreenCoordinates(
            tilesTraveled[tilesTraveled.length - 1].q,
            tilesTraveled[tilesTraveled.length - 1].r,
            ...camera.getCoordinates()
        );
    }

    const currentStepIndex: number = Math.trunc(tilesTraveled.length * timePassed / timeToMove);
    const startTile: TileFoundDescription = tilesTraveled[currentStepIndex];
    if (!startTile) {
        return convertMapCoordinatesToScreenCoordinates(
            tilesTraveled[0].q,
            tilesTraveled[0].r,
            ...camera.getCoordinates()
        );
    }

    let endTile: TileFoundDescription = tilesTraveled[currentStepIndex + 1];
    if (!endTile) {
        endTile = startTile;
    }
    const timePerStep: number = timeToMove / tilesTraveled.length;
    const timeAtStepStart: number = currentStepIndex * timePerStep;
    const xyCoords: [number, number] = lerpSquaddieBetweenPath(
        [
            {
                q: startTile.q,
                r: startTile.r,
                movementCost: 0,
            },
            {
                q: endTile.q,
                r: endTile.r,
                movementCost: 0,
            }
        ],
        timePassed - timeAtStepStart,
        timePerStep,
        ...camera.getCoordinates()
    )
    return xyCoords;
}

export const lerpSquaddieBetweenPath = (
    movementPathInfo: TileFoundDescription[],
    timePassed: number,
    totalTravelTime: number,
    cameraX: number,
    cameraY: number,
): [number, number] => {
    const startpoint = convertMapCoordinatesToWorldCoordinates(movementPathInfo[0].q, movementPathInfo[0].r)
    const endpoint = convertMapCoordinatesToWorldCoordinates(movementPathInfo[1].q, movementPathInfo[1].r)

    const lerpX: number = (
        endpoint[0]
        - startpoint[0]
    ) * (timePassed / totalTravelTime) + startpoint[0];
    const lerpY: number = (
        endpoint[1]
        - startpoint[1]
    ) * (timePassed / totalTravelTime) + startpoint[1];

    const xyCoords: [number, number] = convertWorldCoordinatesToScreenCoordinates(
        lerpX, lerpY, cameraX, cameraY)
    return xyCoords;
}