import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "./currentlySelectedSquaddieDecision";
import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {
    TODODELETEMEActionEffectSquaddieTemplate,
    TODODELETEMEActionEffectSquaddieTemplateService
} from "../../decision/TODODELETEMEActionEffectSquaddieTemplate";
import {TODODELETEMEactionEffectSquaddie, ActionEffectSquaddieService} from "../../decision/TODODELETEMEactionEffectSquaddie";
import {TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {DecisionService} from "../../decision/TODODELETEMEdecision";

describe('Current Squaddie Instruction', () => {
    let torrinInstruction: SquaddieDecisionsDuringThisPhase;
    let purifyingBlast: TODODELETEMEActionEffectSquaddieTemplate;
    let purifyingBlastAction: TODODELETEMEactionEffectSquaddie;

    beforeEach(() => {
        torrinInstruction = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "Torrin 0",
            squaddieTemplateId: "Torrin",
            startingLocation: {q: 0, r: 0},
        });

        purifyingBlast = TODODELETEMEActionEffectSquaddieTemplateService.new({
            name: "purifying stream",
            id: "purifying_stream",
            traits: TraitStatusStorageService.newUsingTraitValues(),
        });

        purifyingBlastAction = ActionEffectSquaddieService.new({
            template: purifyingBlast,
            targetLocation: {q: 3, r: 4},
            numberOfActionPointsSpent: 1,
        });
    });

    it('will throw an error if an action is added without setting the squaddie', () => {
        const newInstruction: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: undefined,
        });

        const shouldThrowError = () => {
            CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(newInstruction,
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
});
