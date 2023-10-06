import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {AnySquaddieAction} from "./anySquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";

export class SquaddieActionsForThisRound {
    staticSquaddieId: string;
    dynamicSquaddieId: string;
    startingLocation: HexCoordinate;
    private readonly _actions: AnySquaddieAction[];

    constructor(options: {
        staticSquaddieId: string;
        dynamicSquaddieId: string;
        startingLocation?: HexCoordinate;
    }) {
        this.staticSquaddieId = options.staticSquaddieId;
        this.dynamicSquaddieId = options.dynamicSquaddieId;
        this.startingLocation = options.startingLocation;

        this._actions = [];
    }

    get actions(): AnySquaddieAction[] {
        return this._actions;
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

    addSquaddieSquaddieAction(action: SquaddieSquaddieAction) {
        this._actions.push(action);
    }

    addAction(action: AnySquaddieAction) {
        this._actions.push(action);
    }

    getActionsUsedThisRound(): AnySquaddieAction[] {
        return [...this._actions];
    }

    getMostRecentAction(): AnySquaddieAction {
        if (this._actions.length === 0) {
            return undefined;
        }
        return this._actions[
        this._actions.length - 1
            ];
    }

    totalActionPointsSpent() {
        if (this._actions.some(action => action instanceof SquaddieEndTurnAction)) {
            return 3;
        }

        const addActionPointsSpent: (accumulator: number, currentValue: AnySquaddieAction) => number = (accumulator, currentValue) => {
            if (!(currentValue instanceof SquaddieEndTurnAction)) {
                return accumulator + currentValue.numberOfActionPointsSpent;
            }

            return accumulator;
        };

        return this._actions.reduce(
            addActionPointsSpent,
            0
        );
    }

    destinationLocation(): HexCoordinate | undefined {
        const lastMovementAction = this._actions.reverse().find(action => action instanceof SquaddieMovementAction)
        if (lastMovementAction && lastMovementAction instanceof SquaddieMovementAction) {
            return lastMovementAction.destination;
        }
        return this.startingLocation;
    }

    endTurn() {
        this._actions.push(new SquaddieEndTurnAction());
    }
}
