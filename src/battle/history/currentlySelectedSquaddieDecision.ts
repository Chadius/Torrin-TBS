import {SquaddieActionsForThisRoundService, squaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {Decision} from "../../decision/decision";
import {isValidValue} from "../../utils/validityCheck";


export interface CurrentlySelectedSquaddieDecision {
    squaddieDecisionsDuringThisPhase: squaddieDecisionsDuringThisPhase;
    currentlySelectedDecisionForPreview: Decision;
    movingBattleSquaddieIds: string[];
}

const squaddieHasMadeADecision = (data: CurrentlySelectedSquaddieDecision) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieDecisionsDuringThisPhase !== undefined
        && data.squaddieDecisionsDuringThisPhase.decisions.length > 0;
};

const isBattleSquaddieIdMoving = (data: CurrentlySelectedSquaddieDecision, battleSquaddieId: string): boolean => {
    return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
}

export const SquaddieInstructionInProgressService = {
    new: ({
              squaddieActionsForThisRound,
              currentlySelectedDecisionForPreview,
              movingBattleSquaddieIds,
          }: {
        squaddieActionsForThisRound: squaddieDecisionsDuringThisPhase;
        currentlySelectedDecisionForPreview?: Decision;
        movingBattleSquaddieIds: string[];
    }): CurrentlySelectedSquaddieDecision => {
        return sanitize({
            squaddieDecisionsDuringThisPhase: squaddieActionsForThisRound,
            currentlySelectedDecisionForPreview: currentlySelectedDecisionForPreview,
            movingBattleSquaddieIds,
        });
    },
    sanitize: (data: CurrentlySelectedSquaddieDecision): CurrentlySelectedSquaddieDecision => {
        return sanitize(data);
    },
    squaddieHasActedThisTurn: (data: CurrentlySelectedSquaddieDecision): boolean => {
        return squaddieHasMadeADecision(data);
    },
    battleSquaddieId: (data: CurrentlySelectedSquaddieDecision): string => {
        if (data.squaddieDecisionsDuringThisPhase !== undefined) {
            return data.squaddieDecisionsDuringThisPhase.battleSquaddieId;
        }

        return "";
    },
    canChangeSelectedSquaddie: (data: CurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(data)) {
            return true;
        }

        if (squaddieHasMadeADecision(data)) {
            return false;
        }

        return data.currentlySelectedDecisionForPreview === undefined;
    },
    addConfirmedDecision: (instructionInProgress: CurrentlySelectedSquaddieDecision, decision: Decision) => {
        if (
            !instructionInProgress.squaddieDecisionsDuringThisPhase
            || instructionInProgress.squaddieDecisionsDuringThisPhase.battleSquaddieId == ""
            || instructionInProgress.squaddieDecisionsDuringThisPhase.squaddieTemplateId == ""
        ) {
            throw new Error("no squaddie found, cannot add action");
        }

        SquaddieActionsForThisRoundService.addDecision(instructionInProgress.squaddieDecisionsDuringThisPhase, decision);
    },
    selectDecisionForPreview: (instructionInProgress: CurrentlySelectedSquaddieDecision, decisionToPreview: Decision) => {
        instructionInProgress.currentlySelectedDecisionForPreview = decisionToPreview;
    },
    markBattleSquaddieIdAsMoving: (data: CurrentlySelectedSquaddieDecision, battleSquaddieId: string) => {
        if (isBattleSquaddieIdMoving(data, battleSquaddieId)) {
            return;
        }
        data.movingBattleSquaddieIds.push(battleSquaddieId);
    },
    isBattleSquaddieIdMoving: (data: CurrentlySelectedSquaddieDecision, battleSquaddieId: string): boolean => {
        if (data === undefined) {
            return false;
        }
        return data.movingBattleSquaddieIds.some((id) => id === battleSquaddieId);
    },
    removeBattleSquaddieIdAsMoving: (data: CurrentlySelectedSquaddieDecision, battleSquaddieId: string) => {
        data.movingBattleSquaddieIds = data.movingBattleSquaddieIds.filter(
            (id) => id !== battleSquaddieId
        );
    },
    cancelSelectedPreviewDecision: (data: CurrentlySelectedSquaddieDecision) => {
        data.currentlySelectedDecisionForPreview = undefined;
    }
}

const sanitize = (data: CurrentlySelectedSquaddieDecision): CurrentlySelectedSquaddieDecision => {
    if (data.squaddieDecisionsDuringThisPhase === undefined) {
        data.squaddieDecisionsDuringThisPhase = {
            ...SquaddieActionsForThisRoundService.default(),
        };
    }

    SquaddieActionsForThisRoundService.sanitize(data.squaddieDecisionsDuringThisPhase);
    if (data.movingBattleSquaddieIds === undefined) {
        data.movingBattleSquaddieIds = [];
    }
    return data;
};
