import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { BattleCamera } from "../battleCamera"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

export const TIME_TO_MOVE = 1000.0

export const getSquaddiePositionAlongPath = (
    tilesTraveled: HexCoordinate[],
    timePassed: number,
    timeToMove: number,
    camera: BattleCamera
): { screenX: number; screenY: number } => {
    if (timePassed < 0) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q: tilesTraveled[0].q,
            r: tilesTraveled[0].r,
            ...camera.getCoordinates(),
        })
    }
    if (timePassed > timeToMove) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q: tilesTraveled[tilesTraveled.length - 1].q,
            r: tilesTraveled[tilesTraveled.length - 1].r,
            ...camera.getCoordinates(),
        })
    }

    const currentStepIndex: number = Math.trunc(
        (tilesTraveled.length * timePassed) / timeToMove
    )
    const startTile: HexCoordinate = tilesTraveled[currentStepIndex]
    if (!startTile) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q: tilesTraveled[0].q,
            r: tilesTraveled[0].r,
            ...camera.getCoordinates(),
        })
    }

    let endTile: HexCoordinate = tilesTraveled[currentStepIndex + 1]
    if (!endTile) {
        endTile = startTile
    }
    const timePerStep: number = timeToMove / tilesTraveled.length
    const timeAtStepStart: number = currentStepIndex * timePerStep
    const cameraCoordinates = camera.getCoordinates()
    return lerpSquaddieBetweenPath(
        [
            {
                q: startTile.q,
                r: startTile.r,
            },
            {
                q: endTile.q,
                r: endTile.r,
            },
        ],
        timePassed - timeAtStepStart,
        timePerStep,
        cameraCoordinates.cameraX,
        cameraCoordinates.cameraY
    )
}

export const lerpSquaddieBetweenPath = (
    movementPathInfo: HexCoordinate[],
    timePassed: number,
    totalTravelTime: number,
    cameraX: number,
    cameraY: number
): { screenX: number; screenY: number } => {
    const { worldX: startX, worldY: startY } =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
            movementPathInfo[0].q,
            movementPathInfo[0].r
        )
    const { worldX: endX, worldY: endY } =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
            movementPathInfo[1].q,
            movementPathInfo[1].r
        )

    const lerpX: number =
        (endX - startX) * (timePassed / totalTravelTime) + startX
    const lerpY: number =
        (endY - startY) * (timePassed / totalTravelTime) + startY

    return ConvertCoordinateService.convertWorldLocationToScreenLocation({
        worldX: lerpX,
        worldY: lerpY,
        cameraX,
        cameraY,
    })
}
