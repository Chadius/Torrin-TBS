import {TODODELETEMESquaddieActionsForThisRoundService, TODODELETEMESquaddieDecisionsDuringThisPhase} from "./TODODELETEMESquaddieDecisionsDuringThisPhase";
import {TODODELETEMEdecision} from "../../decision/TODODELETEMEdecision";
import {isValidValue} from "../../utils/validityCheck";

export interface TODODELETEMECurrentlySelectedSquaddieDecision {
    squaddieDecisionsDuringThisPhase: TODODELETEMESquaddieDecisionsDuringThisPhase;
    currentlySelectedDecision: TODODELETEMEdecision;
    decisionIndex: number;
}

export const TODODELETEMECurrentlySelectedSquaddieDecisionService = {
    new: ({
              squaddieActionsForThisRound,
              currentlySelectedDecision,
              decisionIndex,
          }: {
        squaddieActionsForThisRound: TODODELETEMESquaddieDecisionsDuringThisPhase;
        currentlySelectedDecision?: TODODELETEMEdecision;
        decisionIndex?: number;
    }): TODODELETEMECurrentlySelectedSquaddieDecision => {
        return sanitize({
            squaddieDecisionsDuringThisPhase: squaddieActionsForThisRound,
            currentlySelectedDecision: currentlySelectedDecision,
            decisionIndex,
        });
    },
    sanitize: (data: TODODELETEMECurrentlySelectedSquaddieDecision): TODODELETEMECurrentlySelectedSquaddieDecision => {
        return sanitize(data);
    },
    squaddieHasActedThisTurn: (data: TODODELETEMECurrentlySelectedSquaddieDecision): boolean => {
        return squaddieHasMadeADecision(data);
    },
    battleSquaddieId: (data: TODODELETEMECurrentlySelectedSquaddieDecision): string => {
        if (
            isValidValue(data)
            && isValidValue(data.squaddieDecisionsDuringThisPhase)
        ) {
            return data.squaddieDecisionsDuringThisPhase.battleSquaddieId;
        }
        return "";
    },
    addConfirmedDecision: (instructionInProgress: TODODELETEMECurrentlySelectedSquaddieDecision, decision: TODODELETEMEdecision) => {
        if (
            !instructionInProgress.squaddieDecisionsDuringThisPhase
            || instructionInProgress.squaddieDecisionsDuringThisPhase.battleSquaddieId == ""
            || instructionInProgress.squaddieDecisionsDuringThisPhase.squaddieTemplateId == ""
        ) {
            throw new Error("no squaddie found, cannot add action");
        }

        TODODELETEMESquaddieActionsForThisRoundService.addDecision(instructionInProgress.squaddieDecisionsDuringThisPhase, decision);
    },
    selectCurrentDecision: (instructionInProgress: TODODELETEMECurrentlySelectedSquaddieDecision, currentDecision: TODODELETEMEdecision) => {
        instructionInProgress.currentlySelectedDecision = currentDecision;
    },
    cancelSelectedCurrentDecision: (data: TODODELETEMECurrentlySelectedSquaddieDecision) => {
        data.currentlySelectedDecision = undefined;
    },
    hasFinishedIteratingThoughDecisions: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision): boolean => {
        return decisionIndexIsOutOfBounds(currentDecision);
    },
    peekDecision: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision): TODODELETEMEdecision => {
        if (decisionIndexIsOutOfBounds(currentDecision)) {
            return undefined;
        }

        return currentDecision.squaddieDecisionsDuringThisPhase.decisions[currentDecision.decisionIndex];
    },
    nextDecision: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision): TODODELETEMEdecision => {
        if (decisionIndexIsOutOfBounds(currentDecision)) {
            return undefined;
        }

        const nextActionEffect = currentDecision.squaddieDecisionsDuringThisPhase.decisions[currentDecision.decisionIndex];

        currentDecision.decisionIndex += 1;
        return nextActionEffect;
    },
    hasACurrentDecision: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.currentlySelectedDecision !== undefined;
    },
    hasSquaddieMadeADecision: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.squaddieDecisionsDuringThisPhase.decisions.length > 0;
    },
    addCurrentDecisionToDecisionsMadeThisRound: (currentDecision: TODODELETEMECurrentlySelectedSquaddieDecision) => {
        if (!isValidValue(currentDecision)) {
            return;
        }

        TODODELETEMESquaddieActionsForThisRoundService.addDecision(currentDecision.squaddieDecisionsDuringThisPhase, currentDecision.currentlySelectedDecision);
        currentDecision.currentlySelectedDecision = undefined;
        return;
    },
    isDefault: (squaddieCurrentlyActing: TODODELETEMECurrentlySelectedSquaddieDecision): boolean => {
        const defaultSquaddieActions = TODODELETEMESquaddieActionsForThisRoundService.default();
        return squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.squaddieTemplateId === defaultSquaddieActions.squaddieTemplateId
            && squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.battleSquaddieId === defaultSquaddieActions.battleSquaddieId;
    }
}

const sanitize = (data: TODODELETEMECurrentlySelectedSquaddieDecision): TODODELETEMECurrentlySelectedSquaddieDecision => {
    if (data.squaddieDecisionsDuringThisPhase === undefined) {
        data.squaddieDecisionsDuringThisPhase = {
            ...TODODELETEMESquaddieActionsForThisRoundService.default(),
        };
    }

    if (isValidValue(data.decisionIndex) && data.decisionIndex >= data.squaddieDecisionsDuringThisPhase.decisions.length) {
        throw new Error("DecisionActionEffectIterator cannot sanitize, action effect index is out of bounds");
    }

    if (!isValidValue(data.decisionIndex)) {
        data.decisionIndex = 0;
    }

    TODODELETEMESquaddieActionsForThisRoundService.sanitize(data.squaddieDecisionsDuringThisPhase);
    return data;
};

const decisionIndexIsOutOfBounds = (state: TODODELETEMECurrentlySelectedSquaddieDecision) =>
    !isValidValue(state)
    || state.decisionIndex === undefined
    || state.decisionIndex >= state.squaddieDecisionsDuringThisPhase.decisions.length;

const squaddieHasMadeADecision = (data: TODODELETEMECurrentlySelectedSquaddieDecision) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieDecisionsDuringThisPhase !== undefined
        && data.squaddieDecisionsDuringThisPhase.decisions.length > 0;
};
