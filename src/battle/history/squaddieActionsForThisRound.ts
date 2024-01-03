import {ActionEffect, ActionEffectType} from "../../squaddie/actionEffect";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {MULTIPLE_ATTACK_PENALTY, MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX} from "../modifierConstants";
import {isValidValue} from "../../utils/validityCheck";

export interface SquaddieActionsForThisRound {
    squaddieTemplateId: string;
    battleSquaddieId: string;
    startingLocation: HexCoordinate;
    actions: ActionEffect[];
}

function calculateMultipleAttackPenalty(actionsForThisRound: SquaddieActionsForThisRound, actionToPreview: ActionEffect) {
    function doesActionContributesToMAP(action: ActionEffect) {
        if (penaltyMultiplier >= MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX) {
            return false;
        }

        if (action.type !== ActionEffectType.SQUADDIE) {
            return false;
        }

        if (TraitStatusStorageHelper.getStatus(action.squaddieAction.traits, Trait.ATTACK) !== true) {
            return false;
        }

        if (TraitStatusStorageHelper.getStatus(action.squaddieAction.traits, Trait.NO_MULTIPLE_ATTACK_PENALTY) === true) {
            return false;
        }

        return true;
    }

    const attacksThatCouldIncreaseMAP = actionsForThisRound.actions
        .filter(action => action.type === ActionEffectType.SQUADDIE)
        .filter(action => {
            return doesActionContributesToMAP(action);
        });

    if (isValidValue(actionToPreview) && doesActionContributesToMAP(actionToPreview)) {
        attacksThatCouldIncreaseMAP.push(actionToPreview);
    }

    if (attacksThatCouldIncreaseMAP.length <= 1) {
        return {
            penaltyMultiplier: 0,
            multipleAttackPenalty: 0,
        }
    }

    const penaltyMultiplier: number = Math.min(attacksThatCouldIncreaseMAP.length - 1, 2);

    return {
        penaltyMultiplier,
        multipleAttackPenalty: penaltyMultiplier * MULTIPLE_ATTACK_PENALTY,
    }
}

export const SquaddieActionsForThisRoundHandler = {
    default: (): SquaddieActionsForThisRound => {
        return {
            squaddieTemplateId: "",
            battleSquaddieId: "",
            startingLocation: {q: 0, r: 0},
            actions: [],
        }
    },
    sanitize: (data: SquaddieActionsForThisRound): SquaddieActionsForThisRound => {
        if (data.actions === undefined) {
            data.actions = [];
        }
        return data;
    },
    addAction: (data: SquaddieActionsForThisRound, action: ActionEffect) => {
        data.actions.push(action);
    },
    totalActionPointsSpent: (data: SquaddieActionsForThisRound): number => {
        if (data.actions.some(action => action.type === ActionEffectType.END_TURN)) {
            return 3;
        }

        const addActionPointsSpent: (accumulator: number, currentValue: ActionEffect) => number = (accumulator, currentValue) => {
            switch (currentValue.type) {
                case ActionEffectType.SQUADDIE:
                    return accumulator + currentValue.numberOfActionPointsSpent;
                case ActionEffectType.MOVEMENT:
                    return accumulator + currentValue.numberOfActionPointsSpent;
                default:
                    return accumulator;
            }
        };

        return data.actions.reduce(
            addActionPointsSpent,
            0
        );
    },
    destinationLocation: (data: SquaddieActionsForThisRound): HexCoordinate => {
        const lastMovementAction = data.actions.reverse().find(action => action.type === ActionEffectType.MOVEMENT)
        if (lastMovementAction && lastMovementAction.type === ActionEffectType.MOVEMENT) {
            return lastMovementAction.destination;
        }
        return data.startingLocation;
    },
    getMostRecentAction: (data: SquaddieActionsForThisRound): ActionEffect => {
        if (data.actions.length === 0) {
            return undefined;
        }
        return data.actions[
        data.actions.length - 1
            ];
    },
    getActionsUsedThisRound: (data: SquaddieActionsForThisRound): ActionEffect[] => {
        return [...data.actions];
    },
    endTurn: (data: SquaddieActionsForThisRound) => {
        data.actions.push({
            type: ActionEffectType.END_TURN,
        });
    },
    addStartingLocation: (data: SquaddieActionsForThisRound, startingLocation: HexCoordinate) => {
        if (data.startingLocation !== undefined) {
            throw new Error(`already has starting location (${startingLocation.q}, ${startingLocation.r}), cannot add another`)
        }
        data.startingLocation = startingLocation;
    },
    currentMultipleAttackPenalty: (actionsForThisRound: SquaddieActionsForThisRound): {
        penaltyMultiplier: number,
        multipleAttackPenalty: number,
    } => {
        return calculateMultipleAttackPenalty(actionsForThisRound, undefined);
    },
    previewMultipleAttackPenalty: (actionsForThisRound: SquaddieActionsForThisRound, actionToPreview: ActionEffect): {
        penaltyMultiplier: number,
        multipleAttackPenalty: number,
    } => {
        return calculateMultipleAttackPenalty(actionsForThisRound, actionToPreview);
    }
}
