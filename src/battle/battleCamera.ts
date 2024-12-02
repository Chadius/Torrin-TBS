import { assertsInteger, assertsNonNegativeNumber } from "../utils/mathAssert"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { RectArea, RectAreaService } from "../ui/rectArea"

export type PanningInformation = {
    xStartCoordinate: number
    yStartCoordinate: number
    xDestination: number
    yDestination: number
    timeToPan: number
    panStartTime: number
    respectConstraints: boolean
}

export const BattleCameraService = {
    getCoordinates: (
        camera: BattleCamera
    ): { cameraX: number; cameraY: number } => camera.getCoordinates(),
    clone: ({ original }: { original: BattleCamera }): BattleCamera => {
        const newCamera: BattleCamera = new BattleCamera(
            original.xCoordinate,
            original.yCoordinate
        )
        newCamera.setMapDimensionBoundaries(
            original.mapDimensionBoundaries.widthOfWidestRow,
            original.mapDimensionBoundaries.numberOfRows
        )
        newCamera.setXVelocity(original.xVelocity)
        newCamera.setYVelocity(original.yVelocity)
        return newCamera
    },
}

export class BattleCamera {
    xCoordinate: number
    yCoordinate: number

    xVelocity: number
    yVelocity: number

    mapDimensionBoundaries?: {
        widthOfWidestRow: number
        numberOfRows: number
    }

    panningInformation?: PanningInformation

    constructor(xCoordinate: number = 0, yCoordinate: number = 0) {
        this.xCoordinate = xCoordinate
        this.yCoordinate = yCoordinate

        this.xVelocity = 0
        this.yVelocity = 0
    }

    setXVelocity(vel: number) {
        this.xVelocity = vel
    }

    setYVelocity(vel: number) {
        this.yVelocity = vel
    }

    getCoordinates(): { cameraX: number; cameraY: number } {
        return { cameraX: this.xCoordinate, cameraY: this.yCoordinate }
    }

    getVelocity(): { xVelocity: number; yVelocity: number } {
        return { xVelocity: this.xVelocity, yVelocity: this.yVelocity }
    }

    moveCamera() {
        if (this.panningInformation) {
            this.panCamera()
            return
        }

        this.xCoordinate += this.xVelocity
        this.yCoordinate += this.yVelocity
        this.constrainCamera()
    }

    constrainCamera() {
        this.constrainCameraHorizontally()
        this.constrainCameraVertically()
    }

    constrainCameraVertically() {
        const verticalCameraBuffer = ScreenDimensions.SCREEN_HEIGHT / 10

        if (!this.mapDimensionBoundaries) {
            const topOfFirstRow: number = 0
            if (
                this.yCoordinate <
                topOfFirstRow -
                    verticalCameraBuffer +
                    ScreenDimensions.SCREEN_HEIGHT / 2
            ) {
                this.yCoordinate =
                    topOfFirstRow -
                    verticalCameraBuffer +
                    ScreenDimensions.SCREEN_HEIGHT / 2
                this.setYVelocity(0)
                return
            }
            return
        }

        const {
            coordinateLimits,
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        } = this.getCameraBoundaries()
        const mapVerticallyFitsOnScreen =
            worldLocationOfStartOfFirstRow.worldY >= 0 &&
            worldLocationOfEndOfLastRow.worldY <= ScreenDimensions.SCREEN_HEIGHT
        if (mapVerticallyFitsOnScreen) {
            this.yCoordinate =
                (worldLocationOfStartOfFirstRow.worldY +
                    worldLocationOfEndOfLastRow.worldY) /
                2
            this.setYVelocity(0)
            return
        }

        if (this.yCoordinate < coordinateLimits.top) {
            this.yCoordinate = coordinateLimits.top
            this.setYVelocity(0)
            return
        }

        if (this.yCoordinate > RectAreaService.bottom(coordinateLimits)) {
            this.yCoordinate = RectAreaService.bottom(coordinateLimits)
            this.setYVelocity(0)
        }
    }

    constrainCameraHorizontally() {
        if (!this.mapDimensionBoundaries) {
            return
        }

        const {
            coordinateLimits,
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        } = this.getCameraBoundaries()
        const doesMapFitHorizontallyOnScreen =
            worldLocationOfStartOfFirstRow.worldX >= 0 &&
            worldLocationOfEndOfLastRow.worldX <= ScreenDimensions.SCREEN_WIDTH
        if (doesMapFitHorizontallyOnScreen) {
            this.xCoordinate =
                (worldLocationOfStartOfFirstRow.worldX +
                    worldLocationOfEndOfLastRow.worldX) /
                2
            this.setXVelocity(0)
            return
        }

        if (this.xCoordinate < coordinateLimits.left) {
            this.xCoordinate = coordinateLimits.left
            this.setXVelocity(0)
            return
        }

        if (this.xCoordinate > RectAreaService.right(coordinateLimits)) {
            this.xCoordinate = RectAreaService.right(coordinateLimits)
            this.setXVelocity(0)
        }
    }

    setMapDimensionBoundaries(widthOfWidestRow: number, numberOfRows: number) {
        assertsNonNegativeNumber(widthOfWidestRow)
        assertsInteger(widthOfWidestRow)

        assertsNonNegativeNumber(numberOfRows)
        assertsInteger(numberOfRows)

        this.mapDimensionBoundaries = {
            widthOfWidestRow,
            numberOfRows,
        }
    }

    pan({
        respectConstraints,
        timeToPan,
        xDestination,
        yDestination,
    }: {
        yDestination: number
        xDestination: number
        timeToPan: number
        respectConstraints: boolean
    }) {
        if (this.mapDimensionBoundaries) {
            const { coordinateLimits } = this.getCameraBoundaries()

            if (xDestination < coordinateLimits.left) {
                xDestination = coordinateLimits.left
            }
            if (xDestination > RectAreaService.right(coordinateLimits)) {
                xDestination = RectAreaService.right(coordinateLimits)
            }

            if (yDestination < coordinateLimits.top) {
                yDestination = coordinateLimits.top
            }
            if (yDestination > RectAreaService.bottom(coordinateLimits)) {
                yDestination = RectAreaService.bottom(coordinateLimits)
            }
        }

        this.panningInformation = {
            xStartCoordinate: this.xCoordinate,
            yStartCoordinate: this.yCoordinate,
            xDestination: xDestination,
            yDestination: yDestination,
            timeToPan: timeToPan,
            panStartTime: Date.now(),
            respectConstraints: respectConstraints,
        }
    }

    isPanning(): boolean {
        return this.panningInformation !== undefined
    }

    getPanningInformation(): PanningInformation | undefined {
        if (this.panningInformation) {
            return { ...this.panningInformation }
        }
        return undefined
    }

    panCamera(): void {
        const timePassed: number =
            Date.now() - this.panningInformation.panStartTime

        if (timePassed >= this.panningInformation.timeToPan) {
            this.xCoordinate = this.panningInformation.xDestination
            this.yCoordinate = this.panningInformation.yDestination
            if (this.panningInformation.respectConstraints) {
                this.constrainCamera()
            }

            this.panningInformation = undefined
            return
        }

        this.xCoordinate =
            (this.panningInformation.xDestination -
                this.panningInformation.xStartCoordinate) *
                (timePassed / this.panningInformation.timeToPan) +
            this.panningInformation.xStartCoordinate

        this.yCoordinate =
            (this.panningInformation.yDestination -
                this.panningInformation.yStartCoordinate) *
                (timePassed / this.panningInformation.timeToPan) +
            this.panningInformation.yStartCoordinate

        if (this.panningInformation.respectConstraints) {
            this.constrainCamera()
        }
    }

    cut(cutInfo: {
        yDestination: number
        xDestination: number
        respectConstraints: boolean
    }) {
        this.pan({
            xDestination: cutInfo.xDestination,
            yDestination: cutInfo.yDestination,
            timeToPan: 0,
            respectConstraints: cutInfo.respectConstraints,
        })
    }

    private getCameraBoundaries(): {
        coordinateLimits: RectArea
        worldLocationOfStartOfFirstRow: { worldX: number; worldY: number }
        worldLocationOfEndOfLastRow: { worldX: number; worldY: number }
    } {
        if (!this.mapDimensionBoundaries) {
            return {
                coordinateLimits: RectAreaService.new({
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }),
                worldLocationOfStartOfFirstRow: { worldX: 0, worldY: 0 },
                worldLocationOfEndOfLastRow: { worldX: 0, worldY: 0 },
            }
        }

        const horizontalCameraBuffer = ScreenDimensions.SCREEN_WIDTH / 10
        const verticalCameraBuffer = ScreenDimensions.SCREEN_HEIGHT / 10

        const worldLocationOfStartOfFirstRow =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                0,
                0
            )
        const worldLocationOfEndOfLastRow =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                this.mapDimensionBoundaries.numberOfRows,
                this.mapDimensionBoundaries.widthOfWidestRow
            )

        return {
            coordinateLimits: RectAreaService.new({
                left:
                    worldLocationOfStartOfFirstRow.worldX +
                    horizontalCameraBuffer,
                right:
                    worldLocationOfEndOfLastRow.worldX - horizontalCameraBuffer,
                top:
                    worldLocationOfStartOfFirstRow.worldY -
                    verticalCameraBuffer +
                    ScreenDimensions.SCREEN_HEIGHT / 2,
                bottom:
                    worldLocationOfEndOfLastRow.worldY +
                    verticalCameraBuffer -
                    ScreenDimensions.SCREEN_HEIGHT / 2,
            }),
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        }
    }
}
