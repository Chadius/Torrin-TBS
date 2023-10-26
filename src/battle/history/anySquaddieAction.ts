import {SquaddieMovementAction, SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieEndTurnAction, SquaddieEndTurnActionData} from "./squaddieEndTurnAction";
import {SquaddieSquaddieAction, SquaddieSquaddieActionData} from "./squaddieSquaddieAction";

export type AnySquaddieAction = SquaddieSquaddieAction | SquaddieMovementAction | SquaddieEndTurnAction;

export enum SquaddieActionType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE"
}

export interface AnySquaddieActionData {
    type: SquaddieActionType,
    data: SquaddieEndTurnActionData | SquaddieMovementActionData | SquaddieSquaddieActionData,
}
