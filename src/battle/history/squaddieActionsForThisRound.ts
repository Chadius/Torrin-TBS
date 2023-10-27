import {AnySquaddieActionData, SquaddieActionType} from "./anySquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";

export interface SquaddieActionsForThisRoundData {
    squaddieTemplateId: string;
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    actions: AnySquaddieActionData[];
}

export class SquaddieActionsForThisRound implements SquaddieActionsForThisRoundData {
    private readonly _squaddieTemplateId: string;
    private readonly _battleSquaddieId: string;
    private readonly _actions: AnySquaddieActionData[];

    constructor(
        {
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation,
            actions,
        }: {
            squaddieTemplateId: string;
            battleSquaddieId: string;
            startingLocation: HexCoordinate | undefined;
            actions: AnySquaddieActionData[];
        }) {
        this._squaddieTemplateId = squaddieTemplateId;
        this._battleSquaddieId = battleSquaddieId;
        this._startingLocation = startingLocation;
        this._actions = actions;
    }

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
    }

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    private _startingLocation: HexCoordinate;

    get startingLocation(): HexCoordinate {
        return this._startingLocation;
    }

    get actions(): AnySquaddieActionData[] {
        return this._actions;
    }

    addStartingLocation(startingLocation: HexCoordinate) {
        if (this._startingLocation !== undefined) {
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

    destinationLocation(): HexCoordinate {
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
