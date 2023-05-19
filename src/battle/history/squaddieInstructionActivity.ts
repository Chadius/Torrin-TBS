import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";

export type SquaddieInstructionActivity = SquaddieMovementActivity | SquaddieEndTurnActivity;
