import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "./currentlySelectedSquaddieDecision";
import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";
import {Decision, DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

const longswordAction = ActionEffectSquaddieTemplateService.new({
    name: "longsword",
    id: "longsword",
    traits: TraitStatusStorageHelper.newUsingTraitValues({
        [Trait.ATTACK]: true,
        [Trait.TARGET_ARMOR]: true,
        [Trait.TARGETS_FOE]: true,
    }),
    minimumRange: 1,
    maximumRange: 1,
    actionPointCost: 1,
    damageDescriptions: {
        [DamageType.BODY]: 2,
    },
});

describe('CurrentlySelectedSquaddieDecision', () => {
    let moveDecision: Decision;
    let healDecision: Decision;
    let endTurnDecision: Decision;

    beforeEach(() => {
        moveDecision = DecisionService.new({
            actionEffects: [
                ActionEffectMovementService.new({
                    numberOfActionPointsSpent: 1,
                    destination: {q: 0, r: 0},
                }),
            ]
        });

        healDecision = DecisionService.new({
            actionEffects: [
                ActionEffectSquaddieService.new({
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 1, r: 0},
                    template: ActionEffectSquaddieTemplateService.new({
                        id: "healing herb",
                        name: "healing herb",
                    })
                }),
            ]
        });

        endTurnDecision = DecisionService.new({
            actionEffects: [
                ActionEffectEndTurnService.new(),
            ]
        });
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: {q: 1, r: 1},
        });

        SquaddieActionsForThisRoundService.addDecision(longswordUsedThisRoundAction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: longswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }));

        const squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: longswordUsedThisRoundAction,
            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: longswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });

        CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(squaddieCurrentlyActing);
        expect(CurrentlySelectedSquaddieDecisionService.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeTruthy();
    });

    it('will indicate the squaddie has not acted this round if they cancel their first decision', () => {
        const longswordUsedThisRoundAction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: {q: 1, r: 1},
        });

        const squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: longswordUsedThisRoundAction,
            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: longswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });

        CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(squaddieCurrentlyActing);
        expect(CurrentlySelectedSquaddieDecisionService.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeFalsy();
    });

    it('knows when the squaddie is considering a decision', () => {
        let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "template",
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
            }),
            currentlySelectedDecision: undefined,
        });

        expect(CurrentlySelectedSquaddieDecisionService.hasACurrentDecision(currentDecisions)).toBeFalsy();
        currentDecisions.currentlySelectedDecision = moveDecision;
        expect(CurrentlySelectedSquaddieDecisionService.hasACurrentDecision(currentDecisions)).toBeTruthy();
    });

    it('can cancel the previewed decision', () => {
        let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "template",
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
            }),
            currentlySelectedDecision: moveDecision,
        });
        CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(currentDecisions);
        expect(CurrentlySelectedSquaddieDecisionService.hasACurrentDecision(currentDecisions)).toBeFalsy();
        expect(CurrentlySelectedSquaddieDecisionService.hasSquaddieMadeADecision(currentDecisions)).toBeFalsy();
    });

    it('knows when the squaddie has acted already, even if they cancel the current decision', () => {
        let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "template",
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    moveDecision
                ],
            }),
            currentlySelectedDecision: healDecision,
        });

        expect(CurrentlySelectedSquaddieDecisionService.hasSquaddieMadeADecision(currentDecisions)).toBeTruthy();
        CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(currentDecisions);
        expect(CurrentlySelectedSquaddieDecisionService.hasSquaddieMadeADecision(currentDecisions)).toBeTruthy();
    });

    it('can add the previewed action to the actions made this round', () => {
        let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "template",
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    moveDecision,
                ]
            }),
            currentlySelectedDecision: healDecision,
        });

        CurrentlySelectedSquaddieDecisionService.addCurrentDecisionToDecisionsMadeThisRound(currentDecisions);
        expect(CurrentlySelectedSquaddieDecisionService.hasACurrentDecision(currentDecisions)).toBeFalsy();
        expect(currentDecisions.squaddieDecisionsDuringThisPhase.decisions).toEqual([moveDecision, healDecision]);
    });

    it('is unassigned when it has default values', () => {
        const unassigned = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.default()
        });

        expect(CurrentlySelectedSquaddieDecisionService.isDefault(unassigned)).toBeTruthy();
    });

    describe('Iterator', () => {
        it('sets the index to 0 upon creation if no index is provided', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                })
            });

            expect(currentDecisions.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(0);
            expect(currentDecisions.squaddieDecisionsDuringThisPhase.squaddieTemplateId).toEqual("template");
            expect(currentDecisions.decisionIndex).toEqual(0);
        });

        it('sets the decision index to the provided value', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                        healDecision,
                        endTurnDecision,
                    ]
                }),
                decisionIndex: 1,
            });

            expect(currentDecisions.decisionIndex).toEqual(1);
            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toEqual(healDecision);
        });

        it('sanitizes the decisionIndex if it is missing or not a number', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                        healDecision,
                        endTurnDecision,
                    ]
                }),
                decisionIndex: null,
            });
            expect(currentDecisions.decisionIndex).toEqual(0);
        });

        it('throws an error if the decision index is out of bounds during creation', () => {
            const shouldThrowError = () => {
                CurrentlySelectedSquaddieDecisionService.new({
                    squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                        squaddieTemplateId: "template",
                        battleSquaddieId: "battle",
                        startingLocation: {q: 0, r: 0},
                        decisions: [
                            moveDecision,
                            healDecision,
                            endTurnDecision,
                        ]
                    }),
                    decisionIndex: 6,
                });
            }

            expect(shouldThrowError).toThrowError('out of bounds');
        });

        it('will iterate through the decisions', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                        healDecision,
                        endTurnDecision,
                    ]
                }),
            });

            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toBe(moveDecision);
            expect(currentDecisions.decisionIndex).toBe(1);
            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toBe(healDecision);
            expect(currentDecisions.decisionIndex).toBe(2);
            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toBe(endTurnDecision);
            expect(currentDecisions.decisionIndex).toBe(3);
            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toBeUndefined();
        });

        it('will peek at the current decisions', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                        healDecision,
                        endTurnDecision,
                    ]
                }),
            });

            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toBe(moveDecision);
            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toBe(healDecision);
            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toBe(endTurnDecision);
            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toBeUndefined();
        });

        it('knows when it has finished iterating', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                        healDecision,
                        endTurnDecision,
                    ]
                }),
            });
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeFalsy();

            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeFalsy();

            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeFalsy();

            CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions);
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeTruthy();
        });

        it('works when the decision has 1 action', () => {
            let currentDecisions = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "template",
                    battleSquaddieId: "battle",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        moveDecision,
                    ]
                }),
            });

            expect(currentDecisions.decisionIndex).toEqual(0);
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeFalsy();
            expect(CurrentlySelectedSquaddieDecisionService.peekDecision(currentDecisions)).toEqual(moveDecision);

            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toEqual(moveDecision);
            expect(CurrentlySelectedSquaddieDecisionService.hasFinishedIteratingThoughDecisions(currentDecisions)).toBeTruthy();
            expect(CurrentlySelectedSquaddieDecisionService.nextDecision(currentDecisions)).toBeUndefined();
        });
    })
});
