import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieEndTurnActionData} from "./squaddieEndTurnAction";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";

export type AnySquaddieAction = SquaddieSquaddieActionData | SquaddieMovementActionData | SquaddieEndTurnActionData;

export enum SquaddieActionType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE"
}

