import {TODODELETEMEactionEffectMovement} from "./TODODELETEMEactionEffectMovement";
import {TODODELETEMEactionEffectEndTurn} from "./TODODELETEMEactionEffectEndTurn";
import {TODODELETEMEactionEffectSquaddie} from "./TODODELETEMEactionEffectSquaddie";

export type TODODELETEMEactionEffect =
    TODODELETEMEactionEffectSquaddie
    | TODODELETEMEactionEffectMovement
    | TODODELETEMEactionEffectEndTurn;

export enum TODODELETEMEActionEffectType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE"
}

