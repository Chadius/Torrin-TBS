import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {Decision} from "../../decision/decision";
import {isValidValue} from "../../utils/validityCheck";

export interface CurrentlySelectedSquaddieDecision {
    squaddieDecisionsDuringThisPhase: SquaddieDecisionsDuringThisPhase;
    currentlySelectedDecision: Decision;
    decisionIndex: number;
}

export const CurrentlySelectedSquaddieDecisionService = {
    new: ({
              squaddieActionsForThisRound,
              currentlySelectedDecision,
              decisionIndex,
          }: {
        squaddieActionsForThisRound: SquaddieDecisionsDuringThisPhase;
        currentlySelectedDecision?: Decision;
        decisionIndex?: number;
    }): CurrentlySelectedSquaddieDecision => {
        return sanitize({
            squaddieDecisionsDuringThisPhase: squaddieActionsForThisRound,
            currentlySelectedDecision: currentlySelectedDecision,
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
        if (
            isValidValue(data)
            && isValidValue(data.squaddieDecisionsDuringThisPhase)
        ) {
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
    selectCurrentDecision: (instructionInProgress: CurrentlySelectedSquaddieDecision, currentDecision: Decision) => {
        instructionInProgress.currentlySelectedDecision = currentDecision;
    },
    cancelSelectedCurrentDecision: (data: CurrentlySelectedSquaddieDecision) => {
        data.currentlySelectedDecision = undefined;
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
    hasACurrentDecision: (currentDecision: CurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.currentlySelectedDecision !== undefined;
    },
    hasSquaddieMadeADecision: (currentDecision: CurrentlySelectedSquaddieDecision): boolean => {
        if (!isValidValue(currentDecision)) {
            return false;
        }

        return currentDecision.squaddieDecisionsDuringThisPhase.decisions.length > 0;
    },
    addCurrentDecisionToDecisionsMadeThisRound: (currentDecision: CurrentlySelectedSquaddieDecision) => {
        if (!isValidValue(currentDecision)) {
            return;
        }

        SquaddieActionsForThisRoundService.addDecision(currentDecision.squaddieDecisionsDuringThisPhase, currentDecision.currentlySelectedDecision);
        currentDecision.currentlySelectedDecision = undefined;
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

const squaddieHasMadeADecision = (data: CurrentlySelectedSquaddieDecision) => {
    if (data === undefined) {
        return false;
    }

    return data.squaddieDecisionsDuringThisPhase !== undefined
        && data.squaddieDecisionsDuringThisPhase.decisions.length > 0;
};
