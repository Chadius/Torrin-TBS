import {TODODELETEMEactionEffect, TODODELETEMEActionEffectType} from "./TODODELETEMEactionEffect";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {isValidValue} from "../utils/validityCheck";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";

export interface TODODELETEMEdecision {
    actionEffects: TODODELETEMEactionEffect[];
}

export const DecisionService = {
    new: ({actionEffects}: { actionEffects?: TODODELETEMEactionEffect[] }): TODODELETEMEdecision => {
        return sanitize({
            actionEffects
        });
    },
    sanitize: (decision: TODODELETEMEdecision): TODODELETEMEdecision => {
        return sanitize(decision);
    },
    addActionEffect: (decision: TODODELETEMEdecision, action: TODODELETEMEactionEffect) => {
        decision.actionEffects.push(action);
    },
    getDestinationLocation: (decision: TODODELETEMEdecision): HexCoordinate => {
        const lastMoveEffect = decision.actionEffects.reverse()
            .find(actionEffect => {
                    if (actionEffect.type === TODODELETEMEActionEffectType.MOVEMENT
                        && isValidValue(actionEffect.destination)) {
                        return true;
                    }
                }
            );
        if (lastMoveEffect.type === TODODELETEMEActionEffectType.MOVEMENT) {
            return lastMoveEffect.destination;
        }
        return undefined;
    },
    willDecisionEndTurn: (decision: TODODELETEMEdecision): boolean => {
        return decision.actionEffects.some(
            afterEffect => afterEffect.type === TODODELETEMEActionEffectType.END_TURN
        );
    },
    multipleAttackPenaltyMultiplier: (decision: TODODELETEMEdecision): number => {
        const getMAPFromActionEffect = (accumulator: number, actionEffect: TODODELETEMEactionEffect): number => {
            if (actionEffect.type !== TODODELETEMEActionEffectType.SQUADDIE) {
                return accumulator;
            }

            if (TraitStatusStorageService.getStatus(actionEffect.template.traits, Trait.ATTACK) !== true) {
                return accumulator;
            }

            const map = TraitStatusStorageService.getStatus(actionEffect.template.traits, Trait.NO_MULTIPLE_ATTACK_PENALTY) ? 0 : 1;
            return accumulator + map;
        }

        return decision.actionEffects.reduce(
            getMAPFromActionEffect,
            0
        );
    }
}

const sanitize = (decision: TODODELETEMEdecision): TODODELETEMEdecision => {
    decision.actionEffects = decision.actionEffects ? decision.actionEffects : [];
    return decision;
}
