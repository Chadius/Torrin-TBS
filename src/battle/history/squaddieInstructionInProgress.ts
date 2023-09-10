import {SquaddieActivitiesForThisRound} from "./squaddieActivitiesForThisRound";
import {SquaddieActivity} from "../../squaddie/activity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionActivity} from "./squaddieInstructionActivity";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";

export class SquaddieInstructionInProgress {
    constructor({
                    activitiesForThisRound,
                    currentSquaddieActivity
                }: {
        activitiesForThisRound?: SquaddieActivitiesForThisRound,
        currentSquaddieActivity?: SquaddieActivity,
    }) {
        this._squaddieActivitiesForThisRound = activitiesForThisRound;
        this._currentlySelectedActivity = currentSquaddieActivity;
        this._movingSquaddieDynamicIds = [];
    }

    get squaddieHasActedThisTurn(): boolean {
        return this.squaddieActivitiesForThisRound !== undefined
            && this.squaddieActivitiesForThisRound.activities.length > 0;
    }

    private _squaddieActivitiesForThisRound?: SquaddieActivitiesForThisRound;

    get squaddieActivitiesForThisRound(): SquaddieActivitiesForThisRound {
        return this._squaddieActivitiesForThisRound;
    }

    private _currentlySelectedActivity?: SquaddieActivity;

    get currentlySelectedActivity(): SquaddieActivity {
        return this._currentlySelectedActivity;
    }

    private _movingSquaddieDynamicIds: string[];

    get movingSquaddieDynamicIds(): string[] {
        return this._movingSquaddieDynamicIds;
    }

    get dynamicSquaddieId(): string {
        if (this._squaddieActivitiesForThisRound !== undefined) {
            return this._squaddieActivitiesForThisRound.dynamicSquaddieId;
        }

        return "";
    }

    get isReadyForNewSquaddie(): boolean {
        return !this.squaddieHasActedThisTurn && this._currentlySelectedActivity === undefined;
    }

    reset() {
        this._squaddieActivitiesForThisRound = undefined;
        this._currentlySelectedActivity = undefined;
        this._movingSquaddieDynamicIds = [];
    }

    addInitialState(param: {
        staticSquaddieId: string;
        dynamicSquaddieId: string;
        startingLocation: HexCoordinate
    }) {
        if (this._squaddieActivitiesForThisRound === undefined) {
            this._squaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
                staticSquaddieId: param.staticSquaddieId,
                dynamicSquaddieId: param.dynamicSquaddieId,
                startingLocation: param.startingLocation,
            });
        }
    }

    addConfirmedActivity(activity: SquaddieInstructionActivity) {
        if (!this._squaddieActivitiesForThisRound) {
            throw new Error("no squaddie found, cannot add activity");
        }

        if (!(
            activity instanceof SquaddieSquaddieActivity
            || activity instanceof SquaddieMovementActivity
            || activity instanceof SquaddieEndTurnActivity
        )) {
            throw new Error("wrong activity type")
        }

        if (activity instanceof SquaddieSquaddieActivity) {
            this.addSelectedActivity(activity.squaddieActivity);
        }

        this.squaddieActivitiesForThisRound.addActivity(activity);
    }

    addSelectedActivity(activity: SquaddieActivity) {
        if (!this._squaddieActivitiesForThisRound) {
            throw new Error("no squaddie found, cannot add activity");
        }

        this._currentlySelectedActivity = activity;
    }

    markSquaddieDynamicIdAsMoving(dynamicSquaddieId: string) {
        if (this.isSquaddieDynamicIdMoving(dynamicSquaddieId)) {
            return;
        }
        this._movingSquaddieDynamicIds.push(dynamicSquaddieId);
    }

    isSquaddieDynamicIdMoving(dynamicSquaddieId: string): boolean {
        return this.movingSquaddieDynamicIds.some((id) => id === dynamicSquaddieId);
    }

    removeSquaddieDynamicIdAsMoving(dynamicSquaddieId: string) {
        this._movingSquaddieDynamicIds = this.movingSquaddieDynamicIds.filter(
            (id) => id !== dynamicSquaddieId
        );
    }

    cancelSelectedActivity() {
        this._currentlySelectedActivity = undefined;

        if (!this.squaddieHasActedThisTurn) {
            this.reset();
        }
    }
}

export const DefaultSquaddieInstructionInProgress = () => {
    return new SquaddieInstructionInProgress({
        activitiesForThisRound: undefined,
        currentSquaddieActivity: undefined,
    })
}
