import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { BattleCamera } from "../battleCamera"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ScreenLocation } from "../../utils/mouseConfig"

export const TIME_TO_MOVE = 1000.0

export const getSquaddiePositionAlongPath = (
    tilesTraveled: HexCoordinate[],
    timePassed: number,
    timeToMove: number,
    camera: BattleCamera
): ScreenLocation => {
    if (timePassed < 0) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: tilesTraveled[0],
            cameraLocation: camera.getWorldLocation(),
        })
    }
    if (timePassed > timeToMove) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: tilesTraveled[tilesTraveled.length - 1],
            cameraLocation: camera.getWorldLocation(),
        })
    }

    const currentStepIndex: number = Math.trunc(
        (tilesTraveled.length * timePassed) / timeToMove
    )
    const startTile: HexCoordinate = tilesTraveled[currentStepIndex]
    if (!startTile) {
        return ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            mapCoordinate: tilesTraveled[0],
            cameraLocation: camera.getWorldLocation(),
        })
    }

    let endTile: HexCoordinate = tilesTraveled[currentStepIndex + 1]
    if (!endTile) {
        endTile = startTile
    }
    const timePerStep: number = timeToMove / tilesTraveled.length
    const timeAtStepStart: number = currentStepIndex * timePerStep
    const cameraCoordinates = camera.getWorldLocation()
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
        cameraCoordinates
    )
}

const lerpSquaddieBetweenPath = (
    movementPathInfo: HexCoordinate[],
    timePassed: number,
    totalTravelTime: number,
    cameraLocation: ScreenLocation
): ScreenLocation => {
    const { x: startX, y: startY } =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
            mapCoordinate: movementPathInfo[0],
        })
    const { x: endX, y: endY } =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
            mapCoordinate: movementPathInfo[1],
        })

    const lerpX: number =
        (endX - startX) * (timePassed / totalTravelTime) + startX
    const lerpY: number =
        (endY - startY) * (timePassed / totalTravelTime) + startY

    return ConvertCoordinateService.convertWorldLocationToScreenLocation({
        worldLocation: { x: lerpX, y: lerpY },
        cameraLocation,
    })
}
