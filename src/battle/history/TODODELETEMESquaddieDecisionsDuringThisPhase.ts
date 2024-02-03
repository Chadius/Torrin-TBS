import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MULTIPLE_ATTACK_PENALTY} from "../modifierConstants";
import {isValidValue} from "../../utils/validityCheck";
import {DecisionService, TODODELETEMEdecision} from "../../decision/TODODELETEMEdecision";

export interface TODODELETEMESquaddieDecisionsDuringThisPhase {
    squaddieTemplateId: string;
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    decisions: TODODELETEMEdecision[];
}

export const TODODELETEMESquaddieActionsForThisRoundService = {
    new: ({
              squaddieTemplateId,
              battleSquaddieId,
              startingLocation,
              decisions,
          }: {
        squaddieTemplateId: string,
        battleSquaddieId: string,
        startingLocation: HexCoordinate,
        decisions?: TODODELETEMEdecision[],
    }): TODODELETEMESquaddieDecisionsDuringThisPhase => {
        return sanitize({
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation,
            decisions,
        });
    },
    default:
        (): TODODELETEMESquaddieDecisionsDuringThisPhase => {
            return sanitize({
                squaddieTemplateId: "",
                battleSquaddieId: "",
                startingLocation: {q: 0, r: 0},
                decisions: [],
            });
        },
    sanitize:
        (data: TODODELETEMESquaddieDecisionsDuringThisPhase): TODODELETEMESquaddieDecisionsDuringThisPhase => {
            return sanitize(data);
        },
    addDecision:
        (data: TODODELETEMESquaddieDecisionsDuringThisPhase, decision: TODODELETEMEdecision) => {
            data.decisions.push(decision);
        },
    getMostRecentDecision:
        (data: TODODELETEMESquaddieDecisionsDuringThisPhase): TODODELETEMEdecision => {
            if (data.decisions.length === 0) {
                return undefined;
            }
            return data.decisions[
            data.decisions.length - 1
                ];
        },
    addStartingLocation:
        (data: TODODELETEMESquaddieDecisionsDuringThisPhase, startingLocation: HexCoordinate) => {
            if (data.startingLocation !== undefined) {
                throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
            }
            data.startingLocation = startingLocation;
        },
    currentMultipleAttackPenalty:
        (actionsForThisRound: TODODELETEMESquaddieDecisionsDuringThisPhase): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return calculateMultipleAttackPenalty(actionsForThisRound, undefined);
        },
    previewMultipleAttackPenalty:
        (actionsForThisRound: TODODELETEMESquaddieDecisionsDuringThisPhase, decisionToPreview: TODODELETEMEdecision): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return calculateMultipleAttackPenalty(actionsForThisRound, decisionToPreview);
        },
    willAnyDecisionEndTurn: (decisionsThisPhase: TODODELETEMESquaddieDecisionsDuringThisPhase): boolean => {
        return decisionsThisPhase.decisions.length > 0
            && decisionsThisPhase.decisions.some(decision => DecisionService.willDecisionEndTurn);
    }
}

function calculateMultipleAttackPenalty(actionsForThisRound: TODODELETEMESquaddieDecisionsDuringThisPhase, decisionToPreview: TODODELETEMEdecision) {
    let multipleAttackPenaltyMultiplier =
        actionsForThisRound.decisions.reduce(
            (accumulator: number, decision: TODODELETEMEdecision): number => {
                return accumulator + DecisionService.multipleAttackPenaltyMultiplier(decision)
            },
            0
        );

    if (isValidValue(decisionToPreview)) {
        multipleAttackPenaltyMultiplier += DecisionService.multipleAttackPenaltyMultiplier(decisionToPreview)
    }

    const boundedMultipleAttackPenaltyMultiplier: number = Math.max(
        0,
        Math.min(
            multipleAttackPenaltyMultiplier - 1,
            2
        )
    );

    return {
        penaltyMultiplier: boundedMultipleAttackPenaltyMultiplier,
        multipleAttackPenalty: boundedMultipleAttackPenaltyMultiplier === 0
            ? 0
            : boundedMultipleAttackPenaltyMultiplier * MULTIPLE_ATTACK_PENALTY
    }
}

const sanitize = (data: TODODELETEMESquaddieDecisionsDuringThisPhase): TODODELETEMESquaddieDecisionsDuringThisPhase => {
    if (isValidValue(data.decisions) !== true) {
        data.decisions = [];
    }

    return data;
};
