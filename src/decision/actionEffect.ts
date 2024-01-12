import {ActionEffectMovement} from "./actionEffectMovement";
import {ActionEffectEndTurn} from "./actionEffectEndTurn";
import {ActionEffectSquaddie} from "./actionEffectSquaddie";

export type ActionEffect = ActionEffectSquaddie | ActionEffectMovement | ActionEffectEndTurn;

export enum ActionEffectType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE"
}

