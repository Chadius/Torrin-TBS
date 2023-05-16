import {SquaddieActivity} from "./activity";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";

export const ACTIVITY_END_TURN_ID = "end_turn";

export const endTurnActivity: SquaddieActivity = new SquaddieActivity({
    id: ACTIVITY_END_TURN_ID,
    name: "End Turn",
    traits: NullTraitStatusStorage()
});
