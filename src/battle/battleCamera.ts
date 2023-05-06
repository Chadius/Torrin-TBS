import {assertsInteger, assertsNonNegativeNumber} from "../utils/mathAssert";
import {
    convertMapCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates
} from "../hexMap/convertCoordinates";
import {ScreenDimensions} from "../utils/graphicsConfig";

export type PanningInformation = {
    xStartCoordinate: number,
    yStartCoordinate: number,
    xDestination: number,
    yDestination: number,
    timeToPan: number,
    panStartTime: number,
    respectConstraints: boolean,
};

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

        const bottomOfLastRow: number = convertMapCoordinatesToWorldCoordinates(
            this.mapDimensionBoundaries.numberOfRows,
            0,
        )[1];

        if (bottomOfLastRow < ScreenDimensions.SCREEN_HEIGHT) {
            this.yCoord = bottomOfLastRow / 2;
            this.setYVelocity(0);
            return;
        }

        const topOfFirstRow: number = 0;
        if (this.yCoord < topOfFirstRow - verticalCameraBuffer + ScreenDimensions.SCREEN_HEIGHT / 2) {
            this.yCoord = topOfFirstRow - verticalCameraBuffer + ScreenDimensions.SCREEN_HEIGHT / 2;
            this.setYVelocity(0);
            return;
        }

        if (this.yCoord > bottomOfLastRow + verticalCameraBuffer - ScreenDimensions.SCREEN_HEIGHT / 2) {
            this.yCoord = bottomOfLastRow + verticalCameraBuffer - ScreenDimensions.SCREEN_HEIGHT / 2;
            this.setYVelocity(0);
            return;
        }
    }

    constrainCameraHorizontally() {
        if (!this.mapDimensionBoundaries) {
            return;
        }

        const currentMapCoordinateCameraIsPointingAt: [number, number] = convertWorldCoordinatesToMapCoordinates(
            ...this.getCoordinates(), false
        );
        const horizontalCameraBuffer = ScreenDimensions.SCREEN_WIDTH / 10;

        const worldLocationOfLeftSide: [number, number] = convertMapCoordinatesToWorldCoordinates(currentMapCoordinateCameraIsPointingAt[0], 0);
        if (this.xCoord < worldLocationOfLeftSide[0] + horizontalCameraBuffer) {
            this.xCoord = worldLocationOfLeftSide[0] + horizontalCameraBuffer;
            this.setXVelocity(0);
            return;
        }

        const worldLocationOfRightSide: [number, number] = convertMapCoordinatesToWorldCoordinates(currentMapCoordinateCameraIsPointingAt[0], this.mapDimensionBoundaries.widthOfWidestRow);
        if (this.xCoord > worldLocationOfRightSide[0] - horizontalCameraBuffer) {
            this.xCoord = worldLocationOfRightSide[0] - horizontalCameraBuffer;
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

    pan(panInfo: { yDestination: number; xDestination: number; timeToPan: number, respectConstraints: boolean }) {
        this.panningInformation = {
            xStartCoordinate: this.xCoord,
            yStartCoordinate: this.yCoord,
            xDestination: panInfo.xDestination,
            yDestination: panInfo.yDestination,
            timeToPan: panInfo.timeToPan,
            panStartTime: Date.now(),
            respectConstraints: panInfo.respectConstraints,
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

    cut(cutInfo: { yDestination: number; xDestination: number; respectConstraints: boolean }) {
        this.pan({
            xDestination: cutInfo.xDestination,
            yDestination: cutInfo.yDestination,
            timeToPan: 0,
            respectConstraints: cutInfo.respectConstraints,
        });
    }
}
