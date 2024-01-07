import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "./squaddieActionsForThisRound";
import {Decision} from "../../decision/decision";
import {ActionEffectType} from "../../decision/actionEffect";
import {isValidValue} from "../../utils/validityCheck";


export interface SquaddieInstructionInProgress {
    squaddieActionsForThisRound: SquaddieActionsForThisRound;
    currentlySelectedDecisionForPreview: Decision;
    movingBattleSquaddieIds: string[];
}

const squaddieHasMadeADecision = (data: SquaddieInstructionInProgress) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieActionsForThisRound !== undefined
        && data.squaddieActionsForThisRound.decisions.length > 0;
};

const isBattleSquaddieIdMoving = (data: SquaddieInstructionInProgress, battleSquaddieId: string): boolean => {
    return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
}

export const SquaddieInstructionInProgressService = {
    new: ({
              squaddieActionsForThisRound,
              currentlySelectedDecisionForPreview,
              movingBattleSquaddieIds,
          }: {
        squaddieActionsForThisRound: SquaddieActionsForThisRound;
        currentlySelectedDecisionForPreview?: Decision;
        movingBattleSquaddieIds: string[];
    }): SquaddieInstructionInProgress => {
        return sanitize({
            squaddieActionsForThisRound,
            currentlySelectedDecisionForPreview: currentlySelectedDecisionForPreview,
            movingBattleSquaddieIds,
        });
    },
    sanitize: (data: SquaddieInstructionInProgress): SquaddieInstructionInProgress => {
        return sanitize(data);
    },
    squaddieHasActedThisTurn: (data: SquaddieInstructionInProgress): boolean => {
        return squaddieHasMadeADecision(data);
    },
    battleSquaddieId: (data: SquaddieInstructionInProgress): string => {
        if (data.squaddieActionsForThisRound !== undefined) {
            return data.squaddieActionsForThisRound.battleSquaddieId;
        }

        return "";
    },
    canChangeSelectedSquaddie: (data: SquaddieInstructionInProgress): boolean => {
        if (!isValidValue(data)) {
            return true;
        }

        if (squaddieHasMadeADecision(data)) {
            return false;
        }

        return data.currentlySelectedDecisionForPreview === undefined;
    },
    addConfirmedDecision: (instructionInProgress: SquaddieInstructionInProgress, decision: Decision) => {
        if (
            !instructionInProgress.squaddieActionsForThisRound
            || instructionInProgress.squaddieActionsForThisRound.battleSquaddieId == ""
            || instructionInProgress.squaddieActionsForThisRound.squaddieTemplateId == ""
        ) {
            throw new Error("no squaddie found, cannot add action");
        }

        SquaddieActionsForThisRoundService.addDecision(instructionInProgress.squaddieActionsForThisRound, decision);
    },
    selectDecisionForPreview: (instructionInProgress: SquaddieInstructionInProgress, decisionToPreview: Decision) => {
        instructionInProgress.currentlySelectedDecisionForPreview = decisionToPreview;
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
    cancelSelectedPreviewDecision: (data: SquaddieInstructionInProgress) => {
        data.currentlySelectedDecisionForPreview = undefined;
    }
}

const sanitize = (data: SquaddieInstructionInProgress): SquaddieInstructionInProgress => {
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
};
