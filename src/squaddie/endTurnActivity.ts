import {SquaddieActivity} from "./activity";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";

export const endTurnActivity: SquaddieActivity = new SquaddieActivity({
    id: "",
    name: "End Turn",
    traits: NullTraitStatusStorage()
});
