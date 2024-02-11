import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";
import {MULTIPLE_ATTACK_PENALTY, MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX} from "../modifierConstants";
import {ProcessedActionEffect} from "../../action/processed/processedActionEffect";
import {ActionTemplate} from "../../action/template/actionTemplate";

export interface ActionsThisRound {
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    processedActions: ProcessedAction[];
    previewedActionTemplateId: string;
    processedActionEffectIteratorIndex: number;
}

export const ActionsThisRoundService = {
    new: ({
              battleSquaddieId,
              startingLocation,
              processedActions,
              previewedActionTemplateId,
          }: {
        battleSquaddieId: string,
        startingLocation: HexCoordinate,
        processedActions?: ProcessedAction[],
        previewedActionTemplateId?: string,
    }): ActionsThisRound => {
        return sanitize({
            battleSquaddieId,
            startingLocation,
            processedActions,
            previewedActionTemplateId: previewedActionTemplateId,
            processedActionEffectIteratorIndex: 0,
        })
    },
    getMultipleAttackPenaltyForProcessedActions:
        (actionsForThisRound: ActionsThisRound): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return getMultipleAttackPenaltyForProcessedActions(actionsForThisRound);
        },
    // TODO test this
    // TODO refactor because the logic is exactly the same
    getProcessedActionToShow: (actionsThisRound: ActionsThisRound): ProcessedAction => {
        if (!isValidValue(actionsThisRound)) {
            return undefined;
        }

        if (actionsThisRound.processedActions.length < 1) {
            return undefined;
        }

        let countDown = actionsThisRound.processedActionEffectIteratorIndex;
        for (const processedAction of actionsThisRound.processedActions) {
            if (countDown < processedAction.processedActionEffects.length) {
                return processedAction;
            }

            countDown -= processedAction.processedActionEffects.length;
        }

        return undefined;
    },
    getProcessedActionEffectToShow: (actionsThisRound: ActionsThisRound): ProcessedActionEffect => {
        if (!isValidValue(actionsThisRound)) {
            return undefined;
        }

        if (actionsThisRound.processedActions.length < 1) {
            return undefined;
        }

        let countDown = actionsThisRound.processedActionEffectIteratorIndex;
        for (const processedAction of actionsThisRound.processedActions) {
            if (countDown < processedAction.processedActionEffects.length) {
                return processedAction.processedActionEffects[countDown];
            }

            countDown -= processedAction.processedActionEffects.length;
        }

        return undefined;
    },
    nextProcessedActionEffectToShow: (actionsThisRound: ActionsThisRound) => {
        if (!isValidValue(actionsThisRound)) {
            return;
        }

        actionsThisRound.processedActionEffectIteratorIndex++;
    }
}

const sanitize = (actions: ActionsThisRound): ActionsThisRound => {
    if (!isValidValue(actions.battleSquaddieId)) {
        throw new Error("ActionsThisRound cannot sanitize, missing battleSquaddieId")
    }

    if (!isValidValue(actions.startingLocation)) {
        throw new Error("ActionsThisRound cannot sanitize, missing startingLocation")
    }

    actions.processedActions = getValidValueOrDefault(actions.processedActions, []);

    return actions;
}

const getMultipleAttackPenaltyForProcessedActions = (actionsThisRound: ActionsThisRound): {
    penaltyMultiplier: number,
    multipleAttackPenalty: number,
} => {
    if (!isValidValue(actionsThisRound)) {
        return convertRawPenaltyMultiplier(0);
    }

    let penaltyMultiplier = actionsThisRound.processedActions.reduce(
        (accumulator: number, processedAction: ProcessedAction) => {
            return accumulator + ProcessedActionService.multipleAttackPenaltyMultiplier(processedAction)
        },
        0
    )

    return convertRawPenaltyMultiplier(penaltyMultiplier);
}

const convertRawPenaltyMultiplier = (penaltyMultiplier: number): {
    penaltyMultiplier: number,
    multipleAttackPenalty: number,
} => {
    penaltyMultiplier = Math.min(penaltyMultiplier, MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX);

    const multipleAttackPenalty = penaltyMultiplier * MULTIPLE_ATTACK_PENALTY === -0
        ? 0
        : penaltyMultiplier * MULTIPLE_ATTACK_PENALTY;

    return {
        penaltyMultiplier,
        multipleAttackPenalty,
    }
}
