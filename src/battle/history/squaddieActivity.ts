import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";

export type SquaddieActivity = SquaddieMovementActivity | SquaddieEndTurnActivity;