import {ActionEffectMovement} from "../battle/history/actionEffectMovement";
import {ActionEffectEndTurn} from "../battle/history/actionEffectEndTurn";
import {ActionEffectSquaddie} from "../battle/history/actionEffectSquaddie";

export type ActionEffect = ActionEffectSquaddie | ActionEffectMovement | ActionEffectEndTurn;

export enum ActionEffectType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE"
}

