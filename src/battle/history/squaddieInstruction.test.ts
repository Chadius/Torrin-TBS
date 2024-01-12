import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {ActionEffectSquaddie, ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectType} from "../../decision/actionEffect";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DecisionService} from "../../decision/decision";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });

        expect(instruction.squaddieTemplateId).toBe("new static squaddie");
        expect(instruction.battleSquaddieId).toBe("new dynamic squaddie");
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });
    it('can add squaddie action', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        const longswordAction: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        });

        SquaddieActionsForThisRoundService.addDecision(instruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: longswordAction,
                        targetLocation: {
                            q: 1,
                            r: 0,
                        },
                        numberOfActionPointsSpent: 1,

                    })
                ]
            }));

        const actionsUsedAfterUsingOneAction = instruction.decisions;
        expect(actionsUsedAfterUsingOneAction).toHaveLength(1);

        expect(actionsUsedAfterUsingOneAction[0].actionEffects[0].type).toBe(ActionEffectType.SQUADDIE);
        const actionUsed: ActionEffectSquaddie = actionsUsedAfterUsingOneAction[0].actionEffects[0] as ActionEffectSquaddie;
        expect(actionUsed.targetLocation).toStrictEqual({q: 1, r: 0});
        expect(actionUsed.numberOfActionPointsSpent).toBe(longswordAction.actionPointCost);

        SquaddieActionsForThisRoundService.addDecision(instruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: longswordAction,
                        targetLocation: {
                            q: 1,
                            r: 0,
                        },
                        numberOfActionPointsSpent: 1,

                    })
                ]
            }));

        const actionsUsedThisRound = instruction.decisions;
        expect(actionsUsedThisRound).toHaveLength(2);
    });
    it('can add end turn action', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        const actionsUsedThisRound = instruction.decisions;
        expect(actionsUsedThisRound).toHaveLength(1);

        expect(actionsUsedThisRound[0].actionEffects[0].type).toBe(ActionEffectType.END_TURN);
    });
});
