import {SquaddieInstruction} from "./squaddieInstruction";
import {SquaddieActivity} from "../../squaddie/activity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionActivity} from "./squaddieInstructionActivity";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";


export class SquaddieInstructionInProgress {
    constructor(options: {
        instruction?: SquaddieInstruction,
        currentSquaddieActivity?: SquaddieActivity,
    }) {
        this._instruction = options.instruction;
        this._currentSquaddieActivity = options.currentSquaddieActivity;
        this._movingSquaddieDynamicIds = [];
    }

    private _instruction?: SquaddieInstruction;

    get instruction(): SquaddieInstruction {
        return this._instruction;
    }

    private _currentSquaddieActivity?: SquaddieActivity;

    get currentSquaddieActivity(): SquaddieActivity {
        return this._currentSquaddieActivity;
    }

    private _movingSquaddieDynamicIds: string[];

    get movingSquaddieDynamicIds(): string[] {
        return this._movingSquaddieDynamicIds;
    }

    get dynamicSquaddieId(): string {
        if (this._instruction !== undefined) {
            return this._instruction.dynamicSquaddieId;
        }

        return "";
    }

    isReadyForNewSquaddie(): boolean {
        return this._instruction === undefined && this._currentSquaddieActivity === undefined;
    }

    reset() {
        this._instruction = undefined;
        this._currentSquaddieActivity = undefined;
        this._movingSquaddieDynamicIds = [];
    }

    addSquaddie(param: {
        staticSquaddieId: string;
        dynamicSquaddieId: string;
        startingLocation: HexCoordinate
    }) {
        if (this._instruction === undefined) {
            this._instruction = new SquaddieInstruction({
                staticSquaddieId: param.staticSquaddieId,
                dynamicSquaddieId: param.dynamicSquaddieId,
                startingLocation: param.startingLocation,
            });
        }
    }

    addConfirmedActivity(activity: SquaddieInstructionActivity) {
        if (!this._instruction) {
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

        this.instruction.addActivity(activity);
    }

    addSelectedActivity(activity: SquaddieActivity) {
        if (!this._instruction) {
            throw new Error("no squaddie found, cannot add activity");
        }

        this._currentSquaddieActivity = activity;
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
}
