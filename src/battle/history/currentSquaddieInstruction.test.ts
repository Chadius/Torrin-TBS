import {SquaddieInstructionInProgress, SquaddieInstructionInProgressService} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "./squaddieActionsForThisRound";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {ActionEffectSquaddie, ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DecisionService} from "../../decision/decision";

describe('Current Squaddie Instruction', () => {
    let torrinInstruction: SquaddieActionsForThisRound;
    let purifyingBlast: ActionEffectSquaddieTemplate;
    let purifyingBlastAction: ActionEffectSquaddie;

    beforeEach(() => {
        torrinInstruction = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "Torrin 0",
            squaddieTemplateId: "Torrin",
            startingLocation: {q: 0, r: 0},
        });

        purifyingBlast = ActionEffectSquaddieTemplateService.new({
            name: "purifying stream",
            id: "purifying_stream",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
        });

        purifyingBlastAction = ActionEffectSquaddieService.new({
            effect: purifyingBlast,
            targetLocation: {q: 3, r: 4},
            numberOfActionPointsSpent: 1,
        });
    })

    it('can be reset', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "torrin 0",
                squaddieTemplateId: "torrin",
                startingLocation: {q: 0, r: 0},
            }),
            currentlySelectedAction: {
                name: "purifying stream",
                id: "purifying_stream",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                damageDescriptions: {},
                healingDescriptions: {},
                actionPointCost: 1,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.SNAKE,
            },
            movingBattleSquaddieIds: [],
        };

        expect(SquaddieInstructionInProgressService.isReadyForNewSquaddie(newInstruction)).toBeFalsy();
    });

    it('will accept new squaddie and action if it is reset', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            currentlySelectedAction: undefined,
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "Torrin",
                battleSquaddieId: "Torrin 0",
                startingLocation: {q: 0, r: 0},
            }),
        };

        expect(SquaddieInstructionInProgressService.battleSquaddieId(newInstruction)).toBe("Torrin 0");

        SquaddieInstructionInProgressService.addConfirmedDecision(newInstruction,
            DecisionService.new({
                actionEffects: [
                    purifyingBlastAction
                ]
            })
        );

        const initialInstruction: SquaddieActionsForThisRound = newInstruction.squaddieActionsForThisRound;

        SquaddieActionsForThisRoundService.addDecision(torrinInstruction, DecisionService.new(
                {
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            effect: purifyingBlast,
                            targetLocation: {q: 3, r: 4},
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                }
            )
        );

        expect(initialInstruction.battleSquaddieId).toBe(torrinInstruction.battleSquaddieId);
        expect(initialInstruction.squaddieTemplateId).toBe(torrinInstruction.squaddieTemplateId);
        expect(initialInstruction.startingLocation.q).toStrictEqual(torrinInstruction.startingLocation.q);
        expect(initialInstruction.startingLocation.r).toStrictEqual(torrinInstruction.startingLocation.r);

        expect(newInstruction.currentlySelectedAction).toStrictEqual(purifyingBlast);
        SquaddieInstructionInProgressService.addConfirmedDecision(newInstruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {q: 2, r: 3},
                        numberOfActionPointsSpent: 2,
                    })
                ]
            })
        );

        expect(newInstruction.squaddieActionsForThisRound.decisions).toHaveLength(2);
    });

    it('will throw an error if an action is added without setting the squaddie', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: undefined,
            currentlySelectedAction: undefined,
            movingBattleSquaddieIds: undefined,
        };

        const shouldThrowError = () => {
            SquaddieInstructionInProgressService.addConfirmedDecision(newInstruction,
                DecisionService.new({
                    actionEffects: [
                        purifyingBlastAction
                    ]
                })
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("no squaddie found, cannot add action");
    });

    describe('mark squaddie as moving', () => {
        it('can mark dynamic squaddies as moving', () => {
            const newInstruction: SquaddieInstructionInProgress = {
                squaddieActionsForThisRound:
                    SquaddieActionsForThisRoundService.new(
                        {
                            squaddieTemplateId: "Torrin",
                            battleSquaddieId: "Torrin 0",
                            startingLocation: {q: 0, r: 0},
                        }),
                currentlySelectedAction: undefined,
                movingBattleSquaddieIds: [],
            };
            SquaddieInstructionInProgressService.markBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressService.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeTruthy();

            SquaddieInstructionInProgressService.removeBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressService.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeFalsy();
        });
    });
});
