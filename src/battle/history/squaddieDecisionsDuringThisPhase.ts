import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MULTIPLE_ATTACK_PENALTY} from "../modifierConstants";
import {isValidValue} from "../../utils/validityCheck";
import {Decision, DecisionService} from "../../decision/decision";

export interface squaddieDecisionsDuringThisPhase {
    squaddieTemplateId: string;
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    decisions: Decision[];
}

export const SquaddieActionsForThisRoundService = {
    new: ({
              squaddieTemplateId,
              battleSquaddieId,
              startingLocation,
              decisions,
          }: {
        squaddieTemplateId: string,
        battleSquaddieId: string,
        startingLocation: HexCoordinate,
        decisions?: Decision[],
    }): squaddieDecisionsDuringThisPhase => {
        return sanitize({
            squaddieTemplateId,
            battleSquaddieId,
            startingLocation,
            decisions,
        });
    },
    default:
        (): squaddieDecisionsDuringThisPhase => {
            return sanitize({
                squaddieTemplateId: "",
                battleSquaddieId: "",
                startingLocation: {q: 0, r: 0},
                decisions: [],
            });
        },
    sanitize:
        (data: squaddieDecisionsDuringThisPhase): squaddieDecisionsDuringThisPhase => {
            return sanitize(data);
        },
    addDecision:
        (data: squaddieDecisionsDuringThisPhase, decision: Decision) => {
            data.decisions.push(decision);
        },
    getMostRecentDecision:
        (data: squaddieDecisionsDuringThisPhase): Decision => {
            if (data.decisions.length === 0) {
                return undefined;
            }
            return data.decisions[
            data.decisions.length - 1
                ];
        },
    addStartingLocation:
        (data: squaddieDecisionsDuringThisPhase, startingLocation: HexCoordinate) => {
            if (data.startingLocation !== undefined) {
                throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
            }
            data.startingLocation = startingLocation;
        },
    currentMultipleAttackPenalty:
        (actionsForThisRound: squaddieDecisionsDuringThisPhase): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return calculateMultipleAttackPenalty(actionsForThisRound, undefined);
        },
    previewMultipleAttackPenalty:
        (actionsForThisRound: squaddieDecisionsDuringThisPhase, decisionToPreview: Decision): {
            penaltyMultiplier: number,
            multipleAttackPenalty: number,
        } => {
            return calculateMultipleAttackPenalty(actionsForThisRound, decisionToPreview);
        }
}

function calculateMultipleAttackPenalty(actionsForThisRound: squaddieDecisionsDuringThisPhase, decisionToPreview: Decision) {
    let multipleAttackPenaltyMultiplier =
        actionsForThisRound.decisions.reduce(
            (accumulator: number, decision: Decision): number => {
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

const sanitize = (data: squaddieDecisionsDuringThisPhase): squaddieDecisionsDuringThisPhase => {
    if (isValidValue(data.decisions) !== true) {
        data.decisions = [];
    }

    return data;
};
