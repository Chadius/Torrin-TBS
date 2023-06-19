import {SquaddieInstruction} from "./squaddieInstruction";
import {SquaddieActivity} from "../../squaddie/activity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionActivity} from "./squaddieInstructionActivity";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";


export class CurrentSquaddieInstruction {
    private _instruction?: SquaddieInstruction;
    private _currentSquaddieActivity?: SquaddieActivity;

    constructor(options: {
        instruction?: SquaddieInstruction,
        currentSquaddieActivity?: SquaddieActivity,
    }) {
        this._instruction = options.instruction;
        this._currentSquaddieActivity = options.currentSquaddieActivity;
    }

    get dynamicSquaddieId(): string {
        return this._instruction.dynamicSquaddieId;
    }

    get currentSquaddieActivity(): SquaddieActivity {
        return this._currentSquaddieActivity;
    }

    get instruction(): SquaddieInstruction {
        return this._instruction;
    }

    isReadyForNewSquaddie(): boolean {
        return this._instruction === undefined && this._currentSquaddieActivity === undefined;
    }

    reset() {
        this._instruction = undefined;
        this._currentSquaddieActivity = undefined;
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
};
