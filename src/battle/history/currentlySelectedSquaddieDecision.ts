import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {Decision} from "../../decision/decision";
import {isValidValue} from "../../utils/validityCheck";

export interface CurrentlySelectedSquaddieDecision {
    squaddieDecisionsDuringThisPhase: SquaddieDecisionsDuringThisPhase;
    currentlySelectedDecisionForPreview: Decision;
    decisionIndex: number;
}

const squaddieHasMadeADecision = (data: CurrentlySelectedSquaddieDecision) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieDecisionsDuringThisPhase !== undefined
        && data.squaddieDecisionsDuringThisPhase.decisions.length > 0;
};

export const CurrentlySelectedSquaddieDecisionService = {
    new: ({
              squaddieActionsForThisRound,
              currentlySelectedDecisionForPreview,
              decisionIndex,
          }: {
        squaddieActionsForThisRound: SquaddieDecisionsDuringThisPhase;
        currentlySelectedDecisionForPreview?: Decision;
        decisionIndex?: number;
    }): CurrentlySelectedSquaddieDecision => {
        return sanitize({
            squaddieDecisionsDuringThisPhase: squaddieActionsForThisRound,
            currentlySelectedDecisionForPreview: currentlySelectedDecisionForPreview,
            decisionIndex,
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
    cancelSelectedPreviewDecision: (data: CurrentlySelectedSquaddieDecision) => {
        data.currentlySelectedDecisionForPreview = undefined;
    },
    hasFinishedIteratingThoughDecisions: (currentDecision: CurrentlySelectedSquaddieDecision): boolean => {
        return decisionIndexIsOutOfBounds(currentDecision);
    },
    peekDecision: (currentDecision: CurrentlySelectedSquaddieDecision): Decision => {
        if (decisionIndexIsOutOfBounds(currentDecision)) {
            return undefined;
        }

        return currentDecision.squaddieDecisionsDuringThisPhase.decisions[currentDecision.decisionIndex];
    },
    nextDecision: (currentDecision: CurrentlySelectedSquaddieDecision): Decision => {
        if (decisionIndexIsOutOfBounds(currentDecision)) {
            return undefined;
        }

        const nextActionEffect = currentDecision.squaddieDecisionsDuringThisPhase.decisions[currentDecision.decisionIndex];

        currentDecision.decisionIndex += 1;
        return nextActionEffect;
    },
    isPreviewingADecision: (currentDecision: CurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.currentlySelectedDecisionForPreview !== undefined;
    },
    hasSquaddieMadeADecision: (currentDecision: CurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.squaddieDecisionsDuringThisPhase.decisions.length > 0;
    },
    addPreviewedDecisionToDecisionsMadeThisRound: (currentDecision: CurrentlySelectedSquaddieDecision) => {
        if (!isValidValue(currentDecision)) {
            return;
        }

        SquaddieActionsForThisRoundService.addDecision(currentDecision.squaddieDecisionsDuringThisPhase, currentDecision.currentlySelectedDecisionForPreview);
        currentDecision.currentlySelectedDecisionForPreview = undefined;
        return;
    },
    isDefault: (squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision): boolean => {
        const defaultSquaddieActions = SquaddieActionsForThisRoundService.default();
        return squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.squaddieTemplateId === defaultSquaddieActions.squaddieTemplateId
            && squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.battleSquaddieId === defaultSquaddieActions.battleSquaddieId;
    }
}

const sanitize = (data: CurrentlySelectedSquaddieDecision): CurrentlySelectedSquaddieDecision => {
    if (data.squaddieDecisionsDuringThisPhase === undefined) {
        data.squaddieDecisionsDuringThisPhase = {
            ...SquaddieActionsForThisRoundService.default(),
        };
    }

    if (isValidValue(data.decisionIndex) && data.decisionIndex >= data.squaddieDecisionsDuringThisPhase.decisions.length) {
        throw new Error("DecisionActionEffectIterator cannot sanitize, action effect index is out of bounds");
    }

    if (!isValidValue(data.decisionIndex)) {
        data.decisionIndex = 0;
    }

    SquaddieActionsForThisRoundService.sanitize(data.squaddieDecisionsDuringThisPhase);
    return data;
};

const decisionIndexIsOutOfBounds = (state: CurrentlySelectedSquaddieDecision) =>
    !isValidValue(state)
    || state.decisionIndex === undefined
    || state.decisionIndex >= state.squaddieDecisionsDuringThisPhase.decisions.length;
