import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieInstructionActivity} from "./squaddieInstructionActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";

export class SquaddieActivitiesForThisRound {
    staticSquaddieId: string;
    dynamicSquaddieId: string;
    startingLocation: HexCoordinate;
    private readonly _activities: SquaddieInstructionActivity[];

    constructor(options: {
        staticSquaddieId: string;
        dynamicSquaddieId: string;
        startingLocation?: HexCoordinate;
    }) {
        this.staticSquaddieId = options.staticSquaddieId;
        this.dynamicSquaddieId = options.dynamicSquaddieId;
        this.startingLocation = options.startingLocation;

        this._activities = [];
    }

    get activities(): SquaddieInstructionActivity[] {
        return this._activities;
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

    addSquaddieSquaddieActivity(activity: SquaddieSquaddieActivity) {
        this._activities.push(activity);
    }

    addActivity(activity: SquaddieInstructionActivity) {
        this._activities.push(activity);
    }

    getActivities(): SquaddieInstructionActivity[] {
        return [...this._activities];
    }

    getMostRecentActivity(): SquaddieInstructionActivity {
        if (this._activities.length === 0) {
            return undefined;
        }
        return this._activities[
        this._activities.length - 1
            ];
    }

    totalActionsSpent() {
        if (this._activities.some(activity => activity instanceof SquaddieEndTurnActivity)) {
            return 3;
        }

        const addActionsSpent: (accumulator: number, currentValue: SquaddieInstructionActivity) => number = (accumulator, currentValue) => {
            if (!(currentValue instanceof SquaddieEndTurnActivity)) {
                return accumulator + currentValue.numberOfActionsSpent;
            }

            return accumulator;
        };

        return this._activities.reduce(
            addActionsSpent,
            0
        );
    }

    destinationLocation(): HexCoordinate | undefined {
        const lastMovementActivity = this._activities.reverse().find(activity => activity instanceof SquaddieMovementActivity)
        if (lastMovementActivity && lastMovementActivity instanceof SquaddieMovementActivity) {
            return lastMovementActivity.destination;
        }
        return this.startingLocation;
    }

    endTurn() {
        this._activities.push(new SquaddieEndTurnActivity());
    }
}
