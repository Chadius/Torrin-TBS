import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "./squaddieActionsForThisRound";
import {ActionEffectSquaddieTemplate} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffectType} from "../../decision/actionEffect";
import {Decision} from "../../decision/decision";


export interface SquaddieInstructionInProgress {
    squaddieActionsForThisRound: SquaddieActionsForThisRound;
    // TODO You want to use the decision here
    currentlySelectedAction: ActionEffectSquaddieTemplate;
    movingBattleSquaddieIds: string[];
}

const squaddieHasActedThisTurn = (data: SquaddieInstructionInProgress) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieActionsForThisRound !== undefined
        && data.squaddieActionsForThisRound.decisions.length > 0;
};

const addSelectedActionEffectSquaddieTemplate = (data: SquaddieInstructionInProgress, action: ActionEffectSquaddieTemplate) => {
    if (!data.squaddieActionsForThisRound) {
        throw new Error("no squaddie found, cannot add action");
    }

    data.currentlySelectedAction = action;
}

const isBattleSquaddieIdMoving = (data: SquaddieInstructionInProgress, battleSquaddieId: string): boolean => {
    return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
}

export const SquaddieInstructionInProgressService = {
    sanitize: (data: SquaddieInstructionInProgress): SquaddieInstructionInProgress => {
        if (data.squaddieActionsForThisRound === undefined) {
            data.squaddieActionsForThisRound = {
                ...SquaddieActionsForThisRoundService.default(),
            };
        }

        SquaddieActionsForThisRoundService.sanitize(data.squaddieActionsForThisRound);
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
    addConfirmedDecision: (instructionInProgress: SquaddieInstructionInProgress, decision: Decision) => {
        if (!instructionInProgress.squaddieActionsForThisRound) {
            throw new Error("no squaddie found, cannot add action");
        }

        const lastSelectedActionEffect = decision.actionEffects.reverse().find(actionEffect => actionEffect.type === ActionEffectType.SQUADDIE);
        if (lastSelectedActionEffect && lastSelectedActionEffect.type === ActionEffectType.SQUADDIE) {
            addSelectedActionEffectSquaddieTemplate(instructionInProgress, lastSelectedActionEffect.effect);
        }

        SquaddieActionsForThisRoundService.addDecision(instructionInProgress.squaddieActionsForThisRound, decision);
    },
    addSelectedActionEffectSquaddieTemplate: (data: SquaddieInstructionInProgress, action: ActionEffectSquaddieTemplate) => {
        addSelectedActionEffectSquaddieTemplate(data, action);
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
