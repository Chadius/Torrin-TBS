import { BattleCamera } from "../../battleCamera"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    CurveInterpolation,
    CurveInterpolationService,
} from "../../../../gitSubmodules/CurveInterpolation/src/curveInterpolation"
import { ScreenLocation } from "../../../utils/mouseConfig"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"

export interface SquaddieMoveOnMapAnimation {
    camera: BattleCamera
    movementPath: HexCoordinate[]
    startAnimationTime: number | undefined
    animationDuration: number
    progressInterpolation: CurveInterpolation
}

const PROGRESS_PERCENTAGE = 100
const WALKING_ANIMATION_TIME = 800

export const SquaddieMoveOnMapAnimationService = {
    new: ({
        camera,
        movementPath,
    }: Partial<SquaddieMoveOnMapAnimation>): SquaddieMoveOnMapAnimation => {
        if (camera == undefined) {
            throw new Error(
                "[SquaddieMoveOnMapAnimationService.new] camera must be defined"
            )
        }

        if (movementPath == undefined) {
            throw new Error(
                "[SquaddieMoveOnMapAnimationService.new] movementPath must be defined"
            )
        }

        if (movementPath.length == 0) {
            throw new Error(
                "[SquaddieMoveOnMapAnimationService.new] movementPath must not be empty"
            )
        }

        const animationDuration =
            movementPath.length > 1
                ? WALKING_ANIMATION_TIME
                : WALKING_ANIMATION_TIME * 0.1
        const progressInterpolation = CurveInterpolationService.new({
            startPoint: [0, 0],
            endPoint: [animationDuration, PROGRESS_PERCENTAGE],
            easeIn: {
                time: animationDuration * 0.2,
                distance: PROGRESS_PERCENTAGE / 10,
            },
            easeOut: {
                time: animationDuration * 0.4,
                distance: PROGRESS_PERCENTAGE / 10,
            },
        })

        return {
            camera,
            movementPath,
            animationDuration: animationDuration,
            startAnimationTime: undefined,
            progressInterpolation,
        }
    },
    hasStartedMoving: (animation: SquaddieMoveOnMapAnimation) =>
        hasStartedMoving(animation),
    update: (animation: SquaddieMoveOnMapAnimation) => {
        if (animation == undefined) {
            throw new Error(
                "[SquaddieMoveOnMapAnimationService.update] animation must be defined"
            )
        }

        if (animation.startAnimationTime == undefined) {
            animation.startAnimationTime = Date.now()
        }
    },
    hasFinishedMoving: (animation: SquaddieMoveOnMapAnimation) =>
        hasFinishedMoving(animation),
    getScreenSquaddieScreenLocation: (
        animation: SquaddieMoveOnMapAnimation
    ): ScreenLocation => {
        if (animation == undefined) {
            throw new Error(
                "[SquaddieMoveOnMapAnimationService.hasFinishedMoving] animation must be defined"
            )
        }

        if (
            animation.startAnimationTime == undefined ||
            animation.movementPath.length == 1
        ) {
            return ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                {
                    mapCoordinate: animation.movementPath[0],
                    cameraLocation: animation.camera.getWorldLocation(),
                }
            )
        }

        if (hasFinishedMoving(animation)) {
            return ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                {
                    mapCoordinate:
                        animation.movementPath[
                            animation.movementPath.length - 1
                        ],
                    cameraLocation: animation.camera.getWorldLocation(),
                }
            )
        }

        const timeElapsed = Date.now() - animation.startAnimationTime
        const percentProgressMoved = CurveInterpolationService.calculate(
            animation.progressInterpolation,
            timeElapsed
        )

        const closestPointsToInterpolateBetween = calculateClosestPoints({
            animation,
            percentProgressMoved,
            camera: animation.camera,
        })

        return interpolateBetweenScreenLocations({
            closestPointsToInterpolateBetween,
            percentProgressMoved,
        })
    },
}

const hasStartedMoving = (animation: SquaddieMoveOnMapAnimation) => {
    if (animation == undefined) {
        throw new Error(
            "[SquaddieMoveOnMapAnimationService.hasStartedMoving] animation must be defined"
        )
    }
    return animation.startAnimationTime != undefined
}

const hasFinishedMoving = (animation: SquaddieMoveOnMapAnimation) => {
    if (animation == undefined) {
        throw new Error(
            "[SquaddieMoveOnMapAnimationService.hasFinishedMoving] animation must be defined"
        )
    }

    return (
        animation.startAnimationTime != undefined &&
        Date.now() - animation.startAnimationTime >= animation.animationDuration
    )
}

const calculateClosestPoints = ({
    animation,
    percentProgressMoved,
    camera,
}: {
    animation: SquaddieMoveOnMapAnimation
    percentProgressMoved: number
    camera: BattleCamera
}): { screenLocation: ScreenLocation; percentProgress: number }[] => {
    if (animation.movementPath.length <= 1)
        return [
            {
                screenLocation:
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: animation.movementPath[0],
                            cameraLocation: camera.getWorldLocation(),
                        }
                    ),
                percentProgress: 0,
            },
            {
                screenLocation:
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: animation.movementPath[0],
                            cameraLocation: camera.getWorldLocation(),
                        }
                    ),
                percentProgress: PROGRESS_PERCENTAGE,
            },
        ]

    const percentPerTile =
        PROGRESS_PERCENTAGE / (animation.movementPath.length - 1)
    const coordinateBorderIndex = Math.floor(
        percentProgressMoved / percentPerTile
    )

    return [coordinateBorderIndex, coordinateBorderIndex + 1].map(
        (borderIndex) => {
            return {
                screenLocation:
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: animation.movementPath[borderIndex],
                            cameraLocation: camera.getWorldLocation(),
                        }
                    ),
                percentProgress: percentPerTile * borderIndex,
            }
        }
    )
}

const interpolateBetweenScreenLocations = ({
    closestPointsToInterpolateBetween,
    percentProgressMoved,
}: {
    closestPointsToInterpolateBetween: {
        screenLocation: ScreenLocation
        percentProgress: number
    }[]
    percentProgressMoved: number
}): ScreenLocation => {
    const percentDistanceFromCoordinate0 =
        percentProgressMoved -
        closestPointsToInterpolateBetween[0].percentProgress
    const percentDistanceFromCoordinate1 =
        closestPointsToInterpolateBetween[1].percentProgress -
        percentProgressMoved
    const totalPercentageDistance =
        closestPointsToInterpolateBetween[1].percentProgress -
        closestPointsToInterpolateBetween[0].percentProgress

    const x =
        (percentDistanceFromCoordinate1 *
            closestPointsToInterpolateBetween[0].screenLocation.x +
            percentDistanceFromCoordinate0 *
                closestPointsToInterpolateBetween[1].screenLocation.x) /
        totalPercentageDistance
    const y =
        (percentDistanceFromCoordinate1 *
            closestPointsToInterpolateBetween[0].screenLocation.y +
            percentDistanceFromCoordinate0 *
                closestPointsToInterpolateBetween[1].screenLocation.y) /
        totalPercentageDistance

    return { x, y }
}
