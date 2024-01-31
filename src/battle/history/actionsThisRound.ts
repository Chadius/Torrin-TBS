import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {ProcessedAction} from "../../action/processed/processedAction";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";
import {DecisionService} from "../../decision/TODODELETEMEdecision";
import {ActionTemplateService} from "../../action/template/actionTemplate";

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
    return {
        penaltyMultiplier: 0,
        multipleAttackPenalty: 0,
    }

    // let multipleAttackPenaltyMultiplier =
    //     actionsForThisRound.processedActions.reduce(
    //         (accumulator: number, processedAction: ProcessedAction): number => {
    //             return accumulator + ActionTemplateService.multipleAttackPenaltyMultiplier()
    //         },
    //         0
    //     );

    // if (isValidValue(decisionToPreview)) {
    //     multipleAttackPenaltyMultiplier += DecisionService.multipleAttackPenaltyMultiplier(decisionToPreview)
    // }
    //
    // const boundedMultipleAttackPenaltyMultiplier: number = Math.max(
    //     0,
    //     Math.min(
    //         multipleAttackPenaltyMultiplier - 1,
    //         2
    //     )
    // );
    //
    // return {
    //     penaltyMultiplier: boundedMultipleAttackPenaltyMultiplier,
    //     multipleAttackPenalty: boundedMultipleAttackPenaltyMultiplier === 0
    //         ? 0
    //         : boundedMultipleAttackPenaltyMultiplier * MULTIPLE_ATTACK_PENALTY
    // }
}
