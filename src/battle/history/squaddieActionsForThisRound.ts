import {AnySquaddieActionData, SquaddieActionType} from "./anySquaddieAction";
import {HexCoordinateData} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";

export class SquaddieActionsForThisRound {
    private readonly _squaddieTemplateId: string;
    private readonly _battleSquaddieId: string;
    private readonly _actions: AnySquaddieActionData[];

    constructor(options: {
        squaddieTemplateId: string;
        battleSquaddieId: string;
        startingLocation?: HexCoordinateData;
    }) {
        this._squaddieTemplateId = options.squaddieTemplateId;
        this._battleSquaddieId = options.battleSquaddieId;
        this._startingLocation = options.startingLocation;

        this._actions = [];
    }

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
    }

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    private _startingLocation: HexCoordinateData;

    get startingLocation(): HexCoordinateData {
        return this._startingLocation;
    }

    get actions(): AnySquaddieActionData[] {
        return this._actions;
    }

    addStartingLocation(startingLocation: HexCoordinateData) {
        if (this._startingLocation) {
            throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
        }
        this._startingLocation = startingLocation;
    }

    addAction(action: AnySquaddieActionData) {
        this._actions.push(action);
    }

    getActionsUsedThisRound(): AnySquaddieActionData[] {
        return [...this._actions];
    }

    getMostRecentAction(): AnySquaddieActionData {
        if (this._actions.length === 0) {
            return undefined;
        }
        return this._actions[
        this._actions.length - 1
            ];
    }

    totalActionPointsSpent() {
        if (this._actions.some(action => action.type === SquaddieActionType.END_TURN)) {
            return 3;
        }

        const addActionPointsSpent: (accumulator: number, currentValue: AnySquaddieActionData) => number = (accumulator, currentValue) => {
            switch (currentValue.type) {
                case SquaddieActionType.SQUADDIE:
                    return accumulator + (currentValue.data as SquaddieSquaddieActionData).numberOfActionPointsSpent;
                case SquaddieActionType.MOVEMENT:
                    return accumulator + (currentValue.data as SquaddieMovementActionData).numberOfActionPointsSpent;
                default:
                    return accumulator;
            }
        };

        return this._actions.reduce(
            addActionPointsSpent,
            0
        );
    }

    destinationLocation(): HexCoordinateData {
        const lastMovementAction = this._actions.reverse().find(action => action.type === SquaddieActionType.MOVEMENT)
        if (lastMovementAction && lastMovementAction.type === SquaddieActionType.MOVEMENT) {
            return (lastMovementAction.data as SquaddieMovementActionData).destination;
        }
        return this._startingLocation;
    }

    endTurn() {
        this._actions.push({
            type: SquaddieActionType.END_TURN,
            data: {},
        });
    }
}
