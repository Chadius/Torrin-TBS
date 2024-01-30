import {DecidedAction, DecidedActionService} from "./decidedAction";
import {DecidedActionEndTurnEffectService} from "./decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../template/actionEffectEndTurnTemplate";
import {DecidedActionMovementEffectService} from "./decidedActionMovementEffect";
import {ActionEffectMovementTemplateService} from "../template/actionEffectMovementTemplate";
import {DecidedActionSquaddieEffectService} from "./decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";

describe('DecidedAction', () => {
    it('can be constructed using given values', () => {
        const decidedAction: DecidedAction = DecidedActionService.new({
            battleSquaddieId: "soldier",
            actionPointCost: 3,
            actionTemplateName: "action",
            actionEffects: [
                DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({})
                })
            ]
        });

        expect(decidedAction.battleSquaddieId).toEqual("soldier");
        expect(decidedAction.actionPointCost).toEqual(3);
        expect(decidedAction.actionTemplateName).toEqual("action");
        expect(decidedAction.actionEffects).toHaveLength(1);
        expect(decidedAction.actionEffects[0]).toEqual(
            DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({})
            })
        );
    });
    describe('sanitize', () => {
        it('set default values if they are not provided', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
            });

            expect(decidedAction.actionPointCost).toEqual(1);
            expect(decidedAction.actionEffects).toHaveLength(0);
            expect(decidedAction.actionTemplateName).toBeUndefined();
        });
        it('will throw an error if no battleSquaddieId is provided', () => {
            const shouldThrowError = () => {
                DecidedActionService.new({battleSquaddieId: undefined});
            }

            expect(() => {
                shouldThrowError()
            }).toThrowError("cannot sanitize");
        });
    });
    describe('doesMostRecentActionRequireDecisions', () => {
        it('it does not if there are no decisions', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeFalsy();
        });
        it('it does not if the most recent decision ended the turn', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                ]
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeFalsy();
        });
        it('it does not if the most recent decision is a movement with a destination', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                        destination: {q: 0, r: 0},
                    })
                ]
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeFalsy();
        });
        it('it does if the most recent decision is a movement without a destination', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                    })
                ]
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeTruthy();
        });
        it('it does not if the most recent decision is a squaddie with a target', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                    }),
                    DecidedActionSquaddieEffectService.new({
                        template: ActionEffectSquaddieTemplateService.new({}),
                        target: {q: 0, r: 0},
                    }),
                ]
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeFalsy();
        });
        it('it does if the most recent decision is a squaddie without a target', () => {
            const decidedAction = DecidedActionService.new({
                battleSquaddieId: "soldier",
                actionEffects: [
                    DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                    DecidedActionMovementEffectService.new({
                        template: ActionEffectMovementTemplateService.new({}),
                    }),
                    DecidedActionSquaddieEffectService.new({
                        template: ActionEffectSquaddieTemplateService.new({})
                    }),
                ]
            });
            expect(DecidedActionService.areDecisionsRequired(decidedAction)).toBeTruthy();
        });
    })
});
