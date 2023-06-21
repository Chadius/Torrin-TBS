import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";

export type SquaddieInstructionActivity = SquaddieSquaddieActivity | SquaddieMovementActivity | SquaddieEndTurnActivity;
