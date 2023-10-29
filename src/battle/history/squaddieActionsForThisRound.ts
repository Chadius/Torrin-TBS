import {AnySquaddieActionData, SquaddieActionType} from "./anySquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";

export interface SquaddieActionsForThisRound {
    squaddieTemplateId: string;
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    actions: AnySquaddieActionData[];
}

export const SquaddieActionsForThisRoundHandler = {
    addAction: (data: SquaddieActionsForThisRound, action: AnySquaddieActionData) => {
        data.actions.push(action);
    },
    totalActionPointsSpent: (data: SquaddieActionsForThisRound): number => {
        if (data.actions.some(action => action.type === SquaddieActionType.END_TURN)) {
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

        return data.actions.reduce(
            addActionPointsSpent,
            0
        );
    },
    destinationLocation: (data: SquaddieActionsForThisRound): HexCoordinate => {
        const lastMovementAction = data.actions.reverse().find(action => action.type === SquaddieActionType.MOVEMENT)
        if (lastMovementAction && lastMovementAction.type === SquaddieActionType.MOVEMENT) {
            return (lastMovementAction.data as SquaddieMovementActionData).destination;
        }
        return data.startingLocation;
    },
    getMostRecentAction: (data: SquaddieActionsForThisRound): AnySquaddieActionData => {
        if (data.actions.length === 0) {
            return undefined;
        }
        return data.actions[
        data.actions.length - 1
            ];
    },
    getActionsUsedThisRound: (data: SquaddieActionsForThisRound): AnySquaddieActionData[] => {
        return [...data.actions];
    },
    endTurn: (data: SquaddieActionsForThisRound) => {
        data.actions.push({
            type: SquaddieActionType.END_TURN,
            data: {},
        });
    },
    addStartingLocation: (data: SquaddieActionsForThisRound, startingLocation: HexCoordinate) => {
        if (data.startingLocation !== undefined) {
            throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
        }
        data.startingLocation = startingLocation;
    }
}
