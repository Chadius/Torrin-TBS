import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {SquaddieSquaddieAction} from "../../squaddie/action";
import {AnySquaddieAction, SquaddieActionType} from "./anySquaddieAction";


export interface SquaddieInstructionInProgress {
    squaddieActionsForThisRound: SquaddieActionsForThisRound;
    currentlySelectedAction: SquaddieSquaddieAction;
    movingBattleSquaddieIds: string[];
}

const squaddieHasActedThisTurn = (data: SquaddieInstructionInProgress) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieActionsForThisRound !== undefined
        && data.squaddieActionsForThisRound.actions.length > 0;
};

const addSelectedAction = (data: SquaddieInstructionInProgress, action: SquaddieSquaddieAction) => {
    if (!data.squaddieActionsForThisRound) {
        throw new Error("no squaddie found, cannot add action");
    }

    data.currentlySelectedAction = action;
}

const isBattleSquaddieIdMoving = (data: SquaddieInstructionInProgress, battleSquaddieId: string): boolean => {
    return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
}

export const SquaddieInstructionInProgressHandler = {
    sanitize: (data: SquaddieInstructionInProgress): SquaddieInstructionInProgress => {
        if (data.squaddieActionsForThisRound === undefined) {
            data.squaddieActionsForThisRound = {
                ...SquaddieActionsForThisRoundHandler.default(),
            };
        }

        SquaddieActionsForThisRoundHandler.sanitize(data.squaddieActionsForThisRound);
        if (data.movingBattleSquaddieIds === undefined) {
            data.movingBattleSquaddieIds = [];
        }
        return data;
    },
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

        switch (action.type) {
            case SquaddieActionType.SQUADDIE:
                addSelectedAction(data, action.squaddieAction);
                SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound,
                    {
                        type: SquaddieActionType.SQUADDIE,
                        squaddieAction: action.squaddieAction,
                        targetLocation: action.targetLocation,
                        numberOfActionPointsSpent: action.numberOfActionPointsSpent,
                    }
                );
                break;
            case SquaddieActionType.MOVEMENT:
                SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound, {
                    type: SquaddieActionType.MOVEMENT,
                    destination: action.destination,
                    numberOfActionPointsSpent: action.numberOfActionPointsSpent,
                });
                break;
            default:
                SquaddieActionsForThisRoundHandler.addAction(data.squaddieActionsForThisRound, {
                    type: SquaddieActionType.END_TURN,
                });
                break;
        }
    },
    addSelectedAction: (data: SquaddieInstructionInProgress, action: SquaddieSquaddieAction) => {
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
