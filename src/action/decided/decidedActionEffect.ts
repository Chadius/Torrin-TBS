import {DecidedActionSquaddieEffect} from "./decidedActionSquaddieEffect";
import {DecidedActionMovementEffect} from "./decidedActionMovementEffect";
import {DecidedActionEndTurnEffect} from "./decidedActionEndTurnEffect";

export type DecidedActionEffect =
    DecidedActionSquaddieEffect
    | DecidedActionMovementEffect
    | DecidedActionEndTurnEffect;
