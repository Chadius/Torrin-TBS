import {HexCoordinate} from "../../hexMap/hexGrid";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";

type SquaddieInstructionRequiredOptions = {
    staticSquaddieId: string;
    dynamicSquaddieId: string;
}

type SquaddieInstructionOptionalOptions = {
    startingLocation: HexCoordinate;
}

export class SquaddieInstruction {
    staticSquaddieId: string;
    dynamicSquaddieId: string;
    startingLocation: HexCoordinate;

    activities: (SquaddieMovementActivity | SquaddieEndTurnActivity)[];

    constructor(options: SquaddieInstructionRequiredOptions & Partial<SquaddieInstructionOptionalOptions>) {
        this.staticSquaddieId = options.staticSquaddieId;
        this.dynamicSquaddieId = options.dynamicSquaddieId;
        this.startingLocation = options.startingLocation;

        this.activities = [];
    }


    getStaticSquaddieId(): string {
        return this.staticSquaddieId;
    }

    getDynamicSquaddieId(): string {
        return this.dynamicSquaddieId;
    }

    getStartingLocation(): HexCoordinate | undefined {
        return this.startingLocation;
    }

    addStartingLocation(startingLocation: HexCoordinate) {
        if (this.startingLocation) {
            throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
        }
        this.startingLocation = startingLocation;
    }

    addMovement(movementActivity: SquaddieMovementActivity) {
        this.activities.push(movementActivity);
    }

    getActivities(): any[] {
        return [...this.activities];
    }

    totalActionsSpent() {
        if (this.activities.some(activity => activity instanceof SquaddieEndTurnActivity)) {
            return 3;
        }

        const addActionsSpent: (accumulator: number, currentValue: SquaddieEndTurnActivity | SquaddieMovementActivity) => number = (accumulator, currentValue) => {
            if (currentValue instanceof SquaddieMovementActivity) {
                return accumulator + currentValue.numberOfActionsSpent;
            }

            return accumulator;
        };

        return this.activities.reduce(
            addActionsSpent,
            0
        );
    }

    destinationLocation(): HexCoordinate | undefined {
        const lastMovementActivity = this.activities.reverse().find(activity => activity instanceof SquaddieMovementActivity)
        if (lastMovementActivity && lastMovementActivity instanceof SquaddieMovementActivity) {
            return lastMovementActivity.destination;
        }
        return this.startingLocation;
    }

    endTurn() {
        this.activities.push(new SquaddieEndTurnActivity());
    }
}