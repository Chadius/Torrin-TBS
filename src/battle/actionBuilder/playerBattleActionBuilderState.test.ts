import {PlayerBattleActionBuilderState, PlayerBattleActionBuilderStateService} from "./playerBattleActionBuilderState";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";
import {DamageType} from "../../squaddie/squaddieService";
import {TraitStatusStorageService} from "../../trait/traitStatusStorage";

describe('Action Builder', () => {
    let actionBuilderState: PlayerBattleActionBuilderState;
    let singleTargetAction: ActionTemplate;

    beforeEach(() => {
        actionBuilderState = PlayerBattleActionBuilderStateService.new({});
        singleTargetAction = ActionTemplateService.new({
            id: "single target",
            name: "single target",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: {[DamageType.BODY]: 2},
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        TARGETS_FOE: true
                    })
                })
            ],
        })
    });

    it('Needs actor, action, target, and animation status upon creation', () => {
        expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(false);
        expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(false);
        expect(PlayerBattleActionBuilderStateService.isAnimationComplete(actionBuilderState)).toEqual(false);
    });

    it('can set the actor', () => {
        PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});

        expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
        expect(PlayerBattleActionBuilderStateService.getActor(actionBuilderState)).toEqual({
            battleSquaddieId: "battle squaddie",
        });
        expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
    });

    describe('squaddie on squaddie action', () => {
        beforeEach(() => {
            PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});
            PlayerBattleActionBuilderStateService.addAction({actionBuilderState, actionTemplate: singleTargetAction});
        });
        it('can set the action template without setting a target', () => {
            expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isActionSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(false);
            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                actionTemplate: singleTargetAction,
            });
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        });
        it('can consider the target for an action', () => {
            PlayerBattleActionBuilderStateService.setConsideredTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });

            expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConsidered(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(false);

            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                actionTemplate: singleTargetAction,
            });
            expect(PlayerBattleActionBuilderStateService.getTarget(actionBuilderState)).toEqual({
                targetLocation: {q: 0, r: 1},
                confirmed: false,
            });

            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        });
        it('can confirm an already considered target without declaring the target', () => {
            PlayerBattleActionBuilderStateService.setConsideredTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });
            PlayerBattleActionBuilderStateService.confirmAlreadyConsideredTarget({actionBuilderState});

            expect(PlayerBattleActionBuilderStateService.isTargetConsidered(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(true);
        });
        it('can set the target for an action', () => {
            PlayerBattleActionBuilderStateService.setConfirmedTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });

            expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(true);

            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                actionTemplate: singleTargetAction,
            });
            expect(PlayerBattleActionBuilderStateService.getTarget(actionBuilderState)).toEqual({
                targetLocation: {q: 0, r: 1},
                confirmed: true,
            });

            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        });
        it('Knows the action is complete if an actor, action, target and animation is complete', () => {
            PlayerBattleActionBuilderStateService.setConfirmedTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });
            PlayerBattleActionBuilderStateService.setAnimationCompleted({actionBuilderState, animationCompleted: true});
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(true);
        });
    });

    describe('movement action', () => {
        beforeEach(() => {
            PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});
            PlayerBattleActionBuilderStateService.addAction({actionBuilderState, movement: true});
        });
        it('can set a move action without setting a target', () => {
            expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                movement: true,
            });
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        });
        it('can set the target for movement', () => {
            PlayerBattleActionBuilderStateService.setConfirmedTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });
            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                movement: true,
            });
            expect(PlayerBattleActionBuilderStateService.getTarget(actionBuilderState)).toEqual({
                targetLocation: {q: 0, r: 1},
                confirmed: true,
            });
        });
        it('Knows the action is complete if an actor, action, target and animation is complete', () => {
            PlayerBattleActionBuilderStateService.setConfirmedTarget({
                actionBuilderState,
                targetLocation: {q: 0, r: 1}
            });
            PlayerBattleActionBuilderStateService.setAnimationCompleted({actionBuilderState, animationCompleted: true});
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(true);
        });
    });

    describe('end turn action', () => {
        beforeEach(() => {
            PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});
            PlayerBattleActionBuilderStateService.addAction({actionBuilderState, endTurn: true});
        });
        it('can end the turn and set its target', () => {
            expect(PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)).toEqual(true);
            expect(PlayerBattleActionBuilderStateService.getAction(actionBuilderState)).toEqual({
                endTurn: true,
            });
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(false);
        });
        it('Knows the action is complete if an actor, action, target and animation is complete', () => {
            PlayerBattleActionBuilderStateService.setAnimationCompleted({actionBuilderState, animationCompleted: true});
            expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(true);
        });
    });

    it('can declare the action complete if it is a single target action and a single target is set and animated', () => {
        PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});
        PlayerBattleActionBuilderStateService.addAction({actionBuilderState, actionTemplate: singleTargetAction});
        PlayerBattleActionBuilderStateService.setConfirmedTarget({actionBuilderState, targetLocation: {q: 0, r: 1}});
        PlayerBattleActionBuilderStateService.setAnimationCompleted({actionBuilderState, animationCompleted: true});

        expect(PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)).toEqual(true);
    });

    it('throws an error if no action is specified when it is set', () => {
        expect(() => {
            PlayerBattleActionBuilderStateService.addAction({actionBuilderState});
        }).toThrow("setAction: missing actionTemplate, movement or end turn");
    });

    it('can remove the previously set action', () => {
        PlayerBattleActionBuilderStateService.setActor({actionBuilderState, battleSquaddieId: "battle squaddie"});
        PlayerBattleActionBuilderStateService.addAction({actionBuilderState, actionTemplate: singleTargetAction});
        PlayerBattleActionBuilderStateService.removeAction({actionBuilderState});

        expect(PlayerBattleActionBuilderStateService.isActionSet(actionBuilderState)).toEqual(false);
    });
});
