import {SquaddieActionType} from "./anySquaddieAction";

export interface SquaddieEndTurnActionData {
    type: SquaddieActionType.END_TURN;
}

export const SquaddieEndTurnActionDataService = {
    new: (): SquaddieEndTurnActionData => {
        return {
            type: SquaddieActionType.END_TURN,
        }
    }
}

