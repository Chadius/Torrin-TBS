import {assertsInteger, assertsNonNegativeNumber} from "../utils/mathAssert";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {RectArea} from "../ui/rectArea";

export type PanningInformation = {
    xStartCoordinate: number,
    yStartCoordinate: number,
    xDestination: number,
    yDestination: number,
    timeToPan: number,
    panStartTime: number,
    respectConstraints: boolean,
};

export const BattleCameraHelper = {
    clone: ({original}: { original: BattleCamera }): BattleCamera => {
        const newCamera: BattleCamera = new BattleCamera(original.xCoord, original.yCoord);
        newCamera.setMapDimensionBoundaries(original.mapDimensionBoundaries.widthOfWidestRow, original.mapDimensionBoundaries.numberOfRows);
        newCamera.setXVelocity(original.xVelocity);
        newCamera.setYVelocity(original.yVelocity);
        return newCamera;
    }
}

export class BattleCamera {
    xCoord: number;
    yCoord: number;

    xVelocity: number;
    yVelocity: number;

    mapDimensionBoundaries?: {
        widthOfWidestRow: number;
        numberOfRows: number;
    }

    panningInformation?: PanningInformation;

    constructor(xCoord: number = 0, yCoord: number = 0) {
        this.xCoord = xCoord;
        this.yCoord = yCoord;

        this.xVelocity = 0;
        this.yVelocity = 0;
    }

    setXVelocity(vel: number) {
        this.xVelocity = vel;
    }

    setYVelocity(vel: number) {
        this.yVelocity = vel;
    }

    getCoordinates(): [number, number] {
        return [this.xCoord, this.yCoord];
    }

    getVelocity(): [number, number] {
        return [this.xVelocity, this.yVelocity];
    }

    moveCamera() {
        if (this.panningInformation) {
            this.panCamera();
            return;
        }

        this.xCoord += this.xVelocity;
        this.yCoord += this.yVelocity;
        this.constrainCamera();
    }

    constrainCamera() {
        this.constrainCameraHorizontally();
        this.constrainCameraVertically();
    }

    constrainCameraVertically() {
        const verticalCameraBuffer = ScreenDimensions.SCREEN_HEIGHT / 10;

        if (!this.mapDimensionBoundaries) {
            const topOfFirstRow: number = 0;
            if (this.yCoord < topOfFirstRow - verticalCameraBuffer + ScreenDimensions.SCREEN_HEIGHT / 2) {
                this.yCoord = topOfFirstRow - verticalCameraBuffer + ScreenDimensions.SCREEN_HEIGHT / 2;
                this.setYVelocity(0);
                return;
            }
            return;
        }

        const {
            coordinateLimits,
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        } = this.getCameraBoundaries();
        const mapVerticallyFitsOnScreen = worldLocationOfStartOfFirstRow[1] >= 0 && worldLocationOfEndOfLastRow[1] <= ScreenDimensions.SCREEN_HEIGHT;
        if (mapVerticallyFitsOnScreen) {
            this.yCoord = (worldLocationOfStartOfFirstRow[1] + worldLocationOfEndOfLastRow[1]) / 2;
            this.setYVelocity(0);
            return;
        }

        if (this.yCoord < coordinateLimits.top) {
            this.yCoord = coordinateLimits.top;
            this.setYVelocity(0);
            return;
        }

        if (this.yCoord > coordinateLimits.bottom) {
            this.yCoord = coordinateLimits.bottom;
            this.setYVelocity(0);
            return;
        }
    }

    constrainCameraHorizontally() {
        if (!this.mapDimensionBoundaries) {
            return;
        }

        const {
            coordinateLimits,
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        } = this.getCameraBoundaries();
        const doesMapFitHorizontallyOnScreen = worldLocationOfStartOfFirstRow[0] >= 0 && worldLocationOfEndOfLastRow[0] <= ScreenDimensions.SCREEN_WIDTH;
        if (doesMapFitHorizontallyOnScreen) {
            this.xCoord = (worldLocationOfStartOfFirstRow[0] + worldLocationOfEndOfLastRow[0]) / 2;
            this.setXVelocity(0);
            return;
        }

        if (this.xCoord < coordinateLimits.left) {
            this.xCoord = coordinateLimits.left;
            this.setXVelocity(0);
            return;
        }

        if (this.xCoord > coordinateLimits.right) {
            this.xCoord = coordinateLimits.right;
            this.setXVelocity(0);
            return;
        }
    }

    setMapDimensionBoundaries(widthOfWidestRow: number, numberOfRows: number) {
        assertsNonNegativeNumber(widthOfWidestRow);
        assertsInteger(widthOfWidestRow);

        assertsNonNegativeNumber(numberOfRows);
        assertsInteger(numberOfRows);

        this.mapDimensionBoundaries = {
            widthOfWidestRow,
            numberOfRows
        };
    }

    pan({respectConstraints, timeToPan, xDestination, yDestination}: {
        yDestination: number;
        xDestination: number;
        timeToPan: number,
        respectConstraints: boolean
    }) {

        if (this.mapDimensionBoundaries) {
            const {coordinateLimits} = this.getCameraBoundaries();

            if (xDestination < coordinateLimits.left) {
                xDestination = coordinateLimits.left;
            }
            if (xDestination > coordinateLimits.right) {
                xDestination = coordinateLimits.right;
            }

            if (yDestination < coordinateLimits.top) {
                yDestination = coordinateLimits.top;
            }
            if (yDestination > coordinateLimits.bottom) {
                yDestination = coordinateLimits.bottom;
            }
        }

        this.panningInformation = {
            xStartCoordinate: this.xCoord,
            yStartCoordinate: this.yCoord,
            xDestination: xDestination,
            yDestination: yDestination,
            timeToPan: timeToPan,
            panStartTime: Date.now(),
            respectConstraints: respectConstraints,
        }
    }

    isPanning(): boolean {
        return this.panningInformation !== undefined;
    }

    getPanningInformation(): PanningInformation | undefined {
        if (this.panningInformation) {
            return {...this.panningInformation};
        }
        return undefined;
    }

    panCamera(): void {
        const timePassed: number = Date.now() - this.panningInformation.panStartTime;

        if (timePassed >= this.panningInformation.timeToPan) {
            this.xCoord = this.panningInformation.xDestination;
            this.yCoord = this.panningInformation.yDestination;
            if (this.panningInformation.respectConstraints) {
                this.constrainCamera();
            }

            this.panningInformation = undefined;
            return;
        }

        this.xCoord = (
            this.panningInformation.xDestination
            - this.panningInformation.xStartCoordinate
        ) * (timePassed / this.panningInformation.timeToPan) + this.panningInformation.xStartCoordinate;

        this.yCoord = (
            this.panningInformation.yDestination
            - this.panningInformation.yStartCoordinate
        ) * (timePassed / this.panningInformation.timeToPan) + this.panningInformation.yStartCoordinate;

        if (this.panningInformation.respectConstraints) {
            this.constrainCamera();
        }
    }

    cut(cutInfo: {
        yDestination: number;
        xDestination: number;
        respectConstraints: boolean
    }) {
        this.pan({
            xDestination: cutInfo.xDestination,
            yDestination: cutInfo.yDestination,
            timeToPan: 0,
            respectConstraints: cutInfo.respectConstraints,
        });
    }

    private getCameraBoundaries(): {
        coordinateLimits: RectArea,
        worldLocationOfStartOfFirstRow: [number, number],
        worldLocationOfEndOfLastRow: [number, number],
    } {
        if (!this.mapDimensionBoundaries) {
            return {
                coordinateLimits: new RectArea({
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }),
                worldLocationOfStartOfFirstRow: [0, 0],
                worldLocationOfEndOfLastRow: [0, 0],
            };
        }

        const horizontalCameraBuffer = ScreenDimensions.SCREEN_WIDTH / 10;
        const verticalCameraBuffer = ScreenDimensions.SCREEN_HEIGHT / 10;

        const worldLocationOfStartOfFirstRow: [number, number] = convertMapCoordinatesToWorldCoordinates(0, 0);
        const worldLocationOfEndOfLastRow: [number, number] = convertMapCoordinatesToWorldCoordinates(this.mapDimensionBoundaries.numberOfRows, this.mapDimensionBoundaries.widthOfWidestRow);

        return {
            coordinateLimits: new RectArea({
                left: worldLocationOfStartOfFirstRow[0] + horizontalCameraBuffer,
                right: worldLocationOfEndOfLastRow[0] - horizontalCameraBuffer,
                top: worldLocationOfStartOfFirstRow[1] - verticalCameraBuffer + (ScreenDimensions.SCREEN_HEIGHT / 2),
                bottom: worldLocationOfEndOfLastRow[1] + verticalCameraBuffer - (ScreenDimensions.SCREEN_HEIGHT / 2),
            }),
            worldLocationOfStartOfFirstRow,
            worldLocationOfEndOfLastRow,
        };
    }
}
