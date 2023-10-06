import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {SquaddieAction} from "../../squaddie/action";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {AnySquaddieAction} from "./anySquaddieAction";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";

export class SquaddieInstructionInProgress {
    constructor({
                    actionsForThisRound,
                    currentSquaddieAction
                }: {
        actionsForThisRound?: SquaddieActionsForThisRound,
        currentSquaddieAction?: SquaddieAction,
    }) {
        this._squaddieActionsForThisRound = actionsForThisRound;
        this._currentlySelectedAction = currentSquaddieAction;
        this._movingSquaddieDynamicIds = [];
    }

    get squaddieHasActedThisTurn(): boolean {
        return this.squaddieActionsForThisRound !== undefined
            && this.squaddieActionsForThisRound.actions.length > 0;
    }

    private _squaddieActionsForThisRound?: SquaddieActionsForThisRound;

    get squaddieActionsForThisRound(): SquaddieActionsForThisRound {
        return this._squaddieActionsForThisRound;
    }

    private _currentlySelectedAction?: SquaddieAction;

    get currentlySelectedAction(): SquaddieAction {
        return this._currentlySelectedAction;
    }

    private _movingSquaddieDynamicIds: string[];

    get movingSquaddieDynamicIds(): string[] {
        return this._movingSquaddieDynamicIds;
    }

    get dynamicSquaddieId(): string {
        if (this._squaddieActionsForThisRound !== undefined) {
            return this._squaddieActionsForThisRound.dynamicSquaddieId;
        }

        return "";
    }

    get isReadyForNewSquaddie(): boolean {
        return !this.squaddieHasActedThisTurn && this._currentlySelectedAction === undefined;
    }

    reset() {
        this._squaddieActionsForThisRound = undefined;
        this._currentlySelectedAction = undefined;
        this._movingSquaddieDynamicIds = [];
    }

    addInitialState(param: {
        staticSquaddieId: string;
        dynamicSquaddieId: string;
        startingLocation: HexCoordinate
    }) {
        if (this._squaddieActionsForThisRound === undefined) {
            this._squaddieActionsForThisRound = new SquaddieActionsForThisRound({
                staticSquaddieId: param.staticSquaddieId,
                dynamicSquaddieId: param.dynamicSquaddieId,
                startingLocation: param.startingLocation,
            });
        }
    }

    addConfirmedAction(action: AnySquaddieAction) {
        if (!this._squaddieActionsForThisRound) {
            throw new Error("no squaddie found, cannot add action");
        }

        if (!(
            action instanceof SquaddieSquaddieAction
            || action instanceof SquaddieMovementAction
            || action instanceof SquaddieEndTurnAction
        )) {
            throw new Error("wrong action type")
        }

        if (action instanceof SquaddieSquaddieAction) {
            this.addSelectedAction(action.squaddieAction);
        }

        this.squaddieActionsForThisRound.addAction(action);
    }

    addSelectedAction(action: SquaddieAction) {
        if (!this._squaddieActionsForThisRound) {
            throw new Error("no squaddie found, cannot add action");
        }

        this._currentlySelectedAction = action;
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

    cancelSelectedAction() {
        this._currentlySelectedAction = undefined;

        if (!this.squaddieHasActedThisTurn) {
            this.reset();
        }
    }
}

export const DefaultSquaddieInstructionInProgress = () => {
    return new SquaddieInstructionInProgress({
        actionsForThisRound: undefined,
        currentSquaddieAction: undefined,
    })
}
