import {Decision} from "../../decision/decision";
import {ActionEffect} from "../../decision/actionEffect";
import {isValidValue} from "../../utils/validityCheck";

// TODO questions that need to be asked and answered:
// 2 can the user make a new decision for the squaddie? <-- see if the Decision Action Effect iterator is active
// 3 are we in the middle of showing the results of a decision? <--- see if the Decision Action Effect iterator is active

export interface DecisionActionEffectIterator {
    decision: Decision;
    actionEffectIndex: number;
}

export const DecisionActionEffectIteratorService = {
    new: ({decision, actionEffectIndex}: {
        decision: Decision,
        actionEffectIndex?: number
    }): DecisionActionEffectIterator => {
        return sanitize({
            decision,
            actionEffectIndex,
        });
    },
    sanitize: (state: DecisionActionEffectIterator): DecisionActionEffectIterator => {
        return sanitize(state);
    },
    nextActionEffect: (state: DecisionActionEffectIterator): ActionEffect | undefined => {
        if (
            actionEffectIndexIsOutOfBounds(state)
        ) {
            return undefined;
        }

        const nextActionEffect = state.decision.actionEffects[state.actionEffectIndex];

        state.actionEffectIndex += 1;
        return nextActionEffect;
    },
    peekActionEffect: (state: DecisionActionEffectIterator): ActionEffect | undefined => {
        if (actionEffectIndexIsOutOfBounds(state)) {
            return undefined;
        }

        return state.decision.actionEffects[state.actionEffectIndex];
    },
    hasFinishedIteratingThoughActionEffects: (state: DecisionActionEffectIterator): boolean => {
        return actionEffectIndexIsOutOfBounds(state);
    },
};

const sanitize = (state: DecisionActionEffectIterator): DecisionActionEffectIterator => {
    if (!isValidValue(state.actionEffectIndex)) {
        state.actionEffectIndex = 0;
    }

    if (state.decision.actionEffects.length === 0) {
        throw new Error("DecisionActionEffectIterator cannot sanitize, decision has no action effects");
    }

    if (state.actionEffectIndex >= state.decision.actionEffects.length) {
        throw new Error("DecisionActionEffectIterator cannot sanitize, action effect index is out of bounds");
    }

    return state;
}

const actionEffectIndexIsOutOfBounds = (state: DecisionActionEffectIterator) =>
    !isValidValue(state)
    || state.actionEffectIndex === undefined
    || state.actionEffectIndex >= state.decision.actionEffects.length;
