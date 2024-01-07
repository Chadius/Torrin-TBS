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
            template: purifyingBlast,
            targetLocation: {q: 3, r: 4},
            numberOfActionPointsSpent: 1,
        });
    })

    it('can be reset', () => {
        const newInstruction: SquaddieInstructionInProgress = SquaddieInstructionInProgressService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "torrin 0",
                squaddieTemplateId: "torrin",
                startingLocation: {q: 0, r: 0},
            }),
            currentlySelectedDecisionForPreview: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: ActionEffectSquaddieTemplateService.new({
                            name: "purifying stream",
                            id: "purifying_stream",
                            traits: TraitStatusStorageHelper.newUsingTraitValues(),
                            damageDescriptions: {},
                            healingDescriptions: {},
                            actionPointCost: 1,
                            minimumRange: 0,
                            maximumRange: 1,
                            targetingShape: TargetingShape.SNAKE,
                        }),
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
            movingBattleSquaddieIds: [],
        });

        expect(SquaddieInstructionInProgressService.canChangeSelectedSquaddie(newInstruction)).toBeFalsy();
    });

    it('will throw an error if an action is added without setting the squaddie', () => {
        const newInstruction: SquaddieInstructionInProgress = SquaddieInstructionInProgressService.new({
            squaddieActionsForThisRound: undefined,
            movingBattleSquaddieIds: undefined,
        });

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
            const newInstruction: SquaddieInstructionInProgress = SquaddieInstructionInProgressService.new({
                squaddieActionsForThisRound:
                    SquaddieActionsForThisRoundService.new(
                        {
                            squaddieTemplateId: "Torrin",
                            battleSquaddieId: "Torrin 0",
                            startingLocation: {q: 0, r: 0},
                        }),
                movingBattleSquaddieIds: [],
            });
            SquaddieInstructionInProgressService.markBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressService.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeTruthy();

            SquaddieInstructionInProgressService.removeBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressService.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeFalsy();
        });
    });
});
