import {DecisionService, TODODELETEMEdecision} from "./TODODELETEMEdecision";
import {TODODELETEMEActionEffectType} from "./TODODELETEMEactionEffect";
import {ActionEffectSquaddieService} from "./TODODELETEMEactionEffectSquaddie";
import {TODODELETEMEActionEffectSquaddieTemplateService} from "./TODODELETEMEActionEffectSquaddieTemplate";
import {ActionEffectEndTurnService} from "./TODODELETEMEactionEffectEndTurn";
import {ActionEffectMovementService} from "./TODODELETEMEactionEffectMovement";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";

describe('decision', () => {
    it('can create a decision using many action effects', () => {
        const decision: TODODELETEMEdecision = DecisionService.new({
            actionEffects: [
                {
                    type: TODODELETEMEActionEffectType.MOVEMENT,
                    destination: {q: 0, r: 3},
                    numberOfActionPointsSpent: 1,
                }
            ]
        });

        expect(decision.actionEffects).toHaveLength(1);
    });

    it('can add movement action and its results', () => {
        const decision: TODODELETEMEdecision = DecisionService.new({});
        DecisionService.addActionEffect(decision, {
            type: TODODELETEMEActionEffectType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 0
        });
        DecisionService.addActionEffect(decision, {
            type: TODODELETEMEActionEffectType.MOVEMENT,
            destination: {q: 0, r: 3},
            numberOfActionPointsSpent: 1
        });

        expect(DecisionService.getDestinationLocation(decision)).toEqual({q: 0, r: 3});
    });

    it('knows if the turn was ended', () => {
        const decision: TODODELETEMEdecision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    destination: {q: 0, r: 1},
                    numberOfActionPointsSpent: 0
                }),
                ActionEffectEndTurnService.new(),
            ]
        });

        expect(DecisionService.willDecisionEndTurn(decision)).toBeTruthy();
    });

    it('knows if any of the action effects contribute to the multiple attack penalty', () => {
        const decisionToMoveOnly: TODODELETEMEdecision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    destination: {q: 0, r: 1},
                    numberOfActionPointsSpent: 0
                }),
                ActionEffectMovementService.new({
                    destination: {q: 0, r: 1},
                    numberOfActionPointsSpent: 1
                }),
            ],
        });
        expect(DecisionService.multipleAttackPenaltyMultiplier(decisionToMoveOnly)).toBe(0);

        const decisionToAttack: TODODELETEMEdecision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    destination: {q: 0, r: 1},
                    numberOfActionPointsSpent: 0
                }),
                ActionEffectSquaddieService.new({
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 1, r: 0},
                    template: TODODELETEMEActionEffectSquaddieTemplateService.new({
                        id: "attack",
                        name: "attack",
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        })
                    })
                }),
            ],
        });
        expect(DecisionService.multipleAttackPenaltyMultiplier(decisionToAttack)).toBe(1);
    });

    describe('sanitize', () => {
        it('can create a decision without effects', () => {
            const decision: TODODELETEMEdecision = DecisionService.new({});
            DecisionService.sanitize(decision);
            expect(decision.actionEffects).toHaveLength(0);
        });
    });
});
