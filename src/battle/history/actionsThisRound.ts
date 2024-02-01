import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";
import {MULTIPLE_ATTACK_PENALTY, MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX} from "../modifierConstants";

export interface ActionsThisRound {
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    processedActions: ProcessedAction[];
    currentActionTemplateId: string;
}

export const ActionsThisRoundService = {
    new: ({
              battleSquaddieId,
              startingLocation,
              processedActions,
              currentActionTemplateId,
          }: {
        battleSquaddieId: string,
        startingLocation: HexCoordinate,
        processedActions?: ProcessedAction[],
        currentActionTemplateId?: string,
    }): ActionsThisRound => {
        return sanitize({
            battleSquaddieId,
            startingLocation,
            processedActions,
            currentActionTemplateId,
        })
    },
    getMultipleAttackPenaltyForProcessedActions:
        (actionsForThisRound: ActionsThisRound): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return getMultipleAttackPenaltyForProcessedActions(actionsForThisRound);
        },
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

const getMultipleAttackPenaltyForProcessedActions = (actionsForThisRound: ActionsThisRound): {
    penaltyMultiplier: number,
    multipleAttackPenalty: number,
} => {
    let penaltyMultiplier = actionsForThisRound.processedActions.reduce(
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
