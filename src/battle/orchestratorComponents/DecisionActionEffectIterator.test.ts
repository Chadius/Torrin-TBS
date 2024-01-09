import {Decision, DecisionService} from "../../decision/decision";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {DecisionActionEffectIterator, DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";

describe('DecisionAnimationState', () => {
    let chargeDecision: Decision;

    beforeEach(() => {
        chargeDecision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    numberOfActionPointsSpent: 1,
                    destination: {q: 0, r: 0},
                }),
                ActionEffectSquaddieService.new({
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 1, r: 0},
                    template: ActionEffectSquaddieTemplateService.new({
                        id: "lance",
                        name: "lance charge",
                    })
                }),
                ActionEffectEndTurnService.new(),
            ]
        });
    });

    it('sets the action effect index to 0 upon creation if not provided', () => {
        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
        });
        expect(animationState.decision).toEqual(chargeDecision);
        expect(animationState.actionEffectIndex).toEqual(0);
    });

    it('sets the action effect index to the provided value', () => {
        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
            actionEffectIndex: 2,
        });
        expect(animationState.decision).toEqual(chargeDecision);
        expect(animationState.actionEffectIndex).toEqual(2);
    });

    it('sanitizes the action effect index if it is missing or not a number', () => {
        let undefinedActionEffectIndexWillBe0: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
            actionEffectIndex: undefined,
        });
        DecisionActionEffectIteratorService.sanitize(undefinedActionEffectIndexWillBe0);
        expect(undefinedActionEffectIndexWillBe0.actionEffectIndex).toEqual(0);
    });

    it('throws an error if the decision has no action effects', () => {
        const throwsAnErrorBecauseDecisionHasNoActionEffects = () => {
            DecisionActionEffectIteratorService.new({
                decision: DecisionService.new({actionEffects: []}),
            });
        };

        expect(throwsAnErrorBecauseDecisionHasNoActionEffects).toThrowError('no action effects');
    });

    it('throws an error if the action effect index is out of bounds during creation', () => {
        const throwsAnErrorBecauseActionEffectIndexIsOutOfBounds = () => {
            DecisionActionEffectIteratorService.new({
                decision: chargeDecision,
                actionEffectIndex: chargeDecision.actionEffects.length,
            });
        };

        expect(throwsAnErrorBecauseActionEffectIndexIsOutOfBounds).toThrowError('out of bounds');
    });

    it('will iterate through the action effects', () => {
        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
        });
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(animationState.actionEffectIndex).toEqual(1);
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(animationState.actionEffectIndex).toEqual(2);
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(animationState.actionEffectIndex).toEqual(3);
    });

    it('will peek at the current action effect', () => {
        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
        });
        expect(DecisionActionEffectIteratorService.peekActionEffect(animationState)).toBe(chargeDecision.actionEffects[0]);
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.peekActionEffect(animationState)).toBe(chargeDecision.actionEffects[1]);
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.peekActionEffect(animationState)).toBe(chargeDecision.actionEffects[2]);
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.peekActionEffect(animationState)).toBe(undefined);
    });

    it('knows when it has finished iterating', () => {
        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: chargeDecision,
        });
        expect(DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(animationState)).toBeFalsy();
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(animationState)).toBeFalsy();
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(animationState)).toBeFalsy();
        DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(animationState)).toBeTruthy();
    });

    it('works when the decision has 1 action', () => {
        const movement = ActionEffectMovementService.new({
            numberOfActionPointsSpent: 1,
            destination: {q: 0, r: 0},
        });

        let decisionWithOneActionEffect = DecisionService.new({
            actionEffects: [
                movement,
            ]
        });

        let animationState: DecisionActionEffectIterator = DecisionActionEffectIteratorService.new({
            decision: decisionWithOneActionEffect,
        });

        expect(DecisionActionEffectIteratorService.peekActionEffect(animationState)).toEqual(movement);
        let nextActionEffect = DecisionActionEffectIteratorService.nextActionEffect(animationState);
        expect(nextActionEffect).toEqual(movement);
        expect(DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(animationState)).toBeTruthy();
        expect(DecisionActionEffectIteratorService.nextActionEffect(animationState)).toBeUndefined();
    });
});
