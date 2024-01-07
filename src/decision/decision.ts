import {ActionEffect, ActionEffectType} from "./actionEffect";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {isValidValue} from "../utils/validityCheck";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";

export interface Decision {
    actionEffects: ActionEffect[];
}

export const DecisionService = {
    new: ({actionEffects}: { actionEffects?: ActionEffect[] }): Decision => {
        return sanitize({
            actionEffects
        });
    },
    sanitize: (decision: Decision): Decision => {
        return sanitize(decision);
    },
    addActionEffect: (decision: Decision, action: ActionEffect) => {
        decision.actionEffects.push(action);
    },
    getDestinationLocation: (decision: Decision): HexCoordinate => {
        const lastMoveEffect = decision.actionEffects.reverse()
            .find(actionEffect => {
                    if (actionEffect.type === ActionEffectType.MOVEMENT
                        && isValidValue(actionEffect.destination)) {
                        return true;
                    }
                }
            );
        if (lastMoveEffect.type === ActionEffectType.MOVEMENT) {
            return lastMoveEffect.destination;
        }
        return undefined;
    },
    willDecisionEndTurn: (decision: Decision): boolean => {
        return decision.actionEffects.some(
            afterEffect => afterEffect.type === ActionEffectType.END_TURN
        );
    },
    multipleAttackPenaltyMultiplier: (decision: Decision): number => {
        const getMAPFromActionEffect = (accumulator: number, actionEffect: ActionEffect): number => {
            if (actionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator;
            }

            if (TraitStatusStorageHelper.getStatus(actionEffect.template.traits, Trait.ATTACK) !== true) {
                return accumulator;
            }

            const map = TraitStatusStorageHelper.getStatus(actionEffect.template.traits, Trait.NO_MULTIPLE_ATTACK_PENALTY) ? 0 : 1;
            return accumulator + map;
        }

        return decision.actionEffects.reduce(
            getMAPFromActionEffect,
            0
        );
    }
}

const sanitize = (decision: Decision): Decision => {
    decision.actionEffects = decision.actionEffects ? decision.actionEffects : [];
    return decision;
}
