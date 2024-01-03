import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {ActionEffect, ActionEffectType} from "../../squaddie/actionEffect";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";

describe('squaddie actions for this round', () => {
    let attackAction: SquaddieSquaddieAction;
    let notAnAttackAction: SquaddieSquaddieAction;
    let attackActionWithoutMAP: SquaddieSquaddieAction;

    beforeEach(() => {
        attackAction = SquaddieSquaddieActionService.new({
            id: "attackAction",
            name: "Attack Action",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });
        notAnAttackAction = SquaddieSquaddieActionService.new({
            id: "notAnAttackAction",
            name: "Not An Attack Action",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: false,
            })
        });
        attackActionWithoutMAP = SquaddieSquaddieActionService.new({
            id: "attackActionWithoutMAP",
            name: "Attack Action without MAP",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
            })
        });
    });

    it('can create new object from squaddie data', () => {
        const squaddieActionData: SquaddieSquaddieAction = {
            id: "attackId",
            name: "cool attack",
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
            damageDescriptions: {[DamageType.MIND]: 1},
            healingDescriptions: {},
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
            actionPointCost: 1,
        };

        const anySquaddieActions: ActionEffect[] = [
            {
                type: ActionEffectType.MOVEMENT,
                destination: {q: 0, r: 3},
                numberOfActionPointsSpent: 1,
            },
            {
                type: ActionEffectType.SQUADDIE,
                squaddieAction: squaddieActionData,
                numberOfActionPointsSpent: 1,
                targetLocation: {q: 0, r: 2},
            },
            {
                type: ActionEffectType.END_TURN,
            },
        ];

        const actionsForThisRound: SquaddieActionsForThisRound = {
            squaddieTemplateId: "template id",
            battleSquaddieId: "battle id",
            startingLocation: {q: 0, r: 0},
            actions: anySquaddieActions,
        };

        const newActionForThisRound: SquaddieActionsForThisRound = {...actionsForThisRound};
        expect(newActionForThisRound.battleSquaddieId).toStrictEqual(actionsForThisRound.battleSquaddieId);
        expect(newActionForThisRound.squaddieTemplateId).toStrictEqual(actionsForThisRound.squaddieTemplateId);
        expect(newActionForThisRound.startingLocation).toStrictEqual(actionsForThisRound.startingLocation);
        expect(newActionForThisRound.actions).toStrictEqual(actionsForThisRound.actions);
    });
    describe('can calculate multiple attack penalty', () => {
        it('will not apply MAP when there are no actions', () => {
            const noActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(noActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will not increase MAP if the action is not an attack', () => {
            const noAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: notAnAttackAction
                    }
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(noAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 0 for executing the first attack', () => {
            const oneAttackActionThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(oneAttackActionThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will not increase MAP if the attack has the trait', () => {
            const oneAttackActionThisRoundWithoutMAP: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackActionWithoutMAP,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(oneAttackActionThisRoundWithoutMAP)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 1 for executing the second attack', () => {
            const twoAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(twoAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will set MAP multiplier to 2 for executing the third attack', () => {
            const threeAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(threeAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
        it('will set MAP multiplier to 2 for executing more than 3 attacks', () => {
            const threeAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(threeAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });

        it('will set MAP multiplier to 0 for previewing the first attack', () => {
            const oneAttackActionThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.previewMultipleAttackPenalty(
                oneAttackActionThisRound,
                {
                    type: ActionEffectType.SQUADDIE,
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 0, r: 0},
                    squaddieAction: attackAction,
                },
            )).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 1 for previewing the second attack', () => {
            const twoAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.previewMultipleAttackPenalty(
                twoAttackActionsThisRound,
                {
                    type: ActionEffectType.SQUADDIE,
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 0, r: 0},
                    squaddieAction: attackAction,
                },
            )).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will set MAP multiplier to 2 for previewing the third attack', () => {
            const threeAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.previewMultipleAttackPenalty(
                threeAttackActionsThisRound,
                {
                    type: ActionEffectType.SQUADDIE,
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 0, r: 0},
                    squaddieAction: attackAction,
                },
            )).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
        it('will set MAP multiplier to 2 for previewing more than 3 attacks', () => {
            const threeAttackActionsThisRound: SquaddieActionsForThisRound = {
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                actions: [
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                    {
                        type: ActionEffectType.SQUADDIE,
                        numberOfActionPointsSpent: 1,
                        targetLocation: {q: 0, r: 0},
                        squaddieAction: attackAction,
                    },
                ],
                startingLocation: {q: 0, r: 0},
            }

            expect(SquaddieActionsForThisRoundHandler.previewMultipleAttackPenalty(
                threeAttackActionsThisRound,
                {
                    type: ActionEffectType.SQUADDIE,
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 0, r: 0},
                    squaddieAction: attackAction,
                },
            )).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
    });
});
