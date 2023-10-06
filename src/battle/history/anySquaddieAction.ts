import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";

export type AnySquaddieAction = SquaddieSquaddieAction | SquaddieMovementAction | SquaddieEndTurnAction;
