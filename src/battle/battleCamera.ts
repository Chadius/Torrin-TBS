export class BattleCamera {
    xCoord: number;
    yCoord: number;

    xVelocity: number;
    yVelocity: number;

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

    moveCamera() {
        this.xCoord += this.xVelocity;
        this.yCoord += this.yVelocity;
    }
}
