import {SquaddieActionsForThisRoundData, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {SquaddieAction, SquaddieActionData} from "../../squaddie/action";
import {AnySquaddieAction, SquaddieActionType} from "./anySquaddieAction";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";


export interface SquaddieInstructionInProgress {
    readonly squaddieActionsForThisRound: SquaddieActionsForThisRoundData;
    currentlySelectedAction: SquaddieActionData;
    movingBattleSquaddieIds: string[];
}

const squaddieHasActedThisTurn = (data: SquaddieInstructionInProgress) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieActionsForThisRound !== undefined
        && data.squaddieActionsForThisRound.actions.length > 0;
};

const addSelectedAction = (data: SquaddieInstructionInProgress, action: SquaddieAction) => {
    if (!data.squaddieActionsForThisRound) {
        throw new Error("no squaddie found, cannot add action");
    }

    data.currentlySelectedAction = action;
}

const isBattleSquaddieIdMoving = (data: SquaddieInstructionInProgress, battleSquaddieId: string): boolean => {
    return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
}

export const SquaddieInstructionInProgressHandler = {
    squaddieHasActedThisTurn: (data: SquaddieInstructionInProgress): boolean => {
        return squaddieHasActedThisTurn(data);
    },
    battleSquaddieId: (data: SquaddieInstructionInProgress): string => {
        if (data.squaddieActionsForThisRound !== undefined) {
            return data.squaddieActionsForThisRound.battleSquaddieId;
        }

        return "";
    },
    isReadyForNewSquaddie: (data: SquaddieInstructionInProgress): boolean => {
        return data === undefined
            || (
                !squaddieHasActedThisTurn(data)
                && data.currentlySelectedAction === undefined
            );
    },
    addConfirmedAction: (data: SquaddieInstructionInProgress, action: AnySquaddieAction) => {
        if (!data.squaddieActionsForThisRound) {
            throw new Error("no squaddie found, cannot add action");
        }

        if (!(
            action instanceof SquaddieSquaddieAction
            || action instanceof SquaddieMovementAction
            || action instanceof SquaddieEndTurnAction
        )) {
            throw new Error("wrong action type")
        }

        if (action instanceof SquaddieSquaddieAction) {
            addSelectedAction(data, action.squaddieAction);
            SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound,
                {
                    type: SquaddieActionType.SQUADDIE,
                    data: {
                        squaddieAction: action.squaddieAction,
                        targetLocation: action.targetLocation,
                        numberOfActionPointsSpent: action.numberOfActionPointsSpent,
                    }
                }
            );
        } else if (action instanceof SquaddieMovementAction) {
            SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound, {
                type: SquaddieActionType.MOVEMENT,
                data: {
                    destination: action.destination,
                    numberOfActionPointsSpent: action.numberOfActionPointsSpent,
                }
            });
        } else {
            SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound, {
                type: SquaddieActionType.END_TURN,
                data: {},
            });
        }
    },

    addSelectedAction: (data: SquaddieInstructionInProgress, action: SquaddieAction) => {
        addSelectedAction(data, action);
    },
    markBattleSquaddieIdAsMoving: (data: SquaddieInstructionInProgress, battleSquaddieId: string) => {
        if (isBattleSquaddieIdMoving(data, battleSquaddieId)) {
            return;
        }
        data.movingBattleSquaddieIds.push(battleSquaddieId);
    },
    isBattleSquaddieIdMoving: (data: SquaddieInstructionInProgress, battleSquaddieId: string): boolean => {
        if (data === undefined) {
            return false;
        }
        return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
    },

    removeBattleSquaddieIdAsMoving: (data: SquaddieInstructionInProgress, battleSquaddieId: string) => {
        data.movingBattleSquaddieIds = data.movingBattleSquaddieIds.filter(
            (id) => id !== battleSquaddieId
        );
    },
    cancelSelectedAction: (data: SquaddieInstructionInProgress) => {
        data.currentlySelectedAction = undefined;
    }
}

export const DefaultSquaddieInstructionInProgress = (): SquaddieInstructionInProgress => {
    return {
        squaddieActionsForThisRound: undefined,
        currentlySelectedAction: undefined,
        movingBattleSquaddieIds: [],
    }
}
