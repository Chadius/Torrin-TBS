import {Decision, DecisionService} from "./decision";
import {ActionEffectType} from "./actionEffect";
import {ActionEffectSquaddieService} from "./actionEffectSquaddie";
import {ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";
import {ActionEffectEndTurnService} from "./actionEffectEndTurn";
import {ActionEffectMovementService} from "./actionEffectMovement";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";

describe('decision', () => {
    it('can create a decision using many action effects', () => {
        const decision: Decision = DecisionService.new({
            actionEffects: [
                {
                    type: ActionEffectType.MOVEMENT,
                    destination: {q: 0, r: 3},
                    numberOfActionPointsSpent: 1,
                }
            ]
        });

        expect(decision.actionEffects).toHaveLength(1);
    });

    it('can add movement action and its results', () => {
        const decision: Decision = DecisionService.new({});
        DecisionService.addActionEffect(decision, {
            type: ActionEffectType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 0
        });
        DecisionService.addActionEffect(decision, {
            type: ActionEffectType.MOVEMENT,
            destination: {q: 0, r: 3},
            numberOfActionPointsSpent: 1
        });

        expect(DecisionService.getDestinationLocation(decision)).toEqual({q: 0, r: 3});
    });

    it('knows if the turn was ended', () => {
        const decision: Decision = DecisionService.new({
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
        const decisionToMoveOnly: Decision = DecisionService.new({
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

        const decisionToAttack: Decision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    destination: {q: 0, r: 1},
                    numberOfActionPointsSpent: 0
                }),
                ActionEffectSquaddieService.new({
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 1, r: 0},
                    template: ActionEffectSquaddieTemplateService.new({
                        id: "attack",
                        name: "attack",
                        traits: TraitStatusStorageHelper.newUsingTraitValues({
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
            const decision: Decision = DecisionService.new({});
            DecisionService.sanitize(decision);
            expect(decision.actionEffects).toHaveLength(0);
        });
    });
});
