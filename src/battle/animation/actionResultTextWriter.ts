import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {DegreeOfSuccess, DegreeOfSuccessHelper} from "../history/actionResultPerSquaddie";
import {ATTACK_MODIFIER} from "../modifierConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {ActionResultText} from "./actionAnimation/actionResultText";

export const FormatResult = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieSquaddieAction,
    result: SquaddieSquaddieResults,
    squaddieRepository: ObjectRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, result.actingBattleSquaddieId))

    let output: string[] = [];
    let actorUsesActionDescriptionText = ActionResultTextWriter.getSquaddieUsesActionString({
        squaddieTemplate: actingSquaddieTemplate,
        action: currentAction,
        newline: false,
    });
    output.push(actorUsesActionDescriptionText);

    if (result.actingSquaddieRoll.occurred) {
        output.push(ActionResultTextWriter.getRollsDescriptionString({
            rolls: result.actingSquaddieRoll.rolls,
            addSpacing: true
        }));

        if (
            TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ATTACK) === true
            && TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ALWAYS_SUCCEEDS) !== true
        ) {
            output.push(...ActionResultText.getAttackPenaltyDescriptions(result.actingSquaddieModifiers));
            output.push(...ActionResultText.getActingSquaddieRollTotalIfNeeded(result));
        }
    }

    result.targetedBattleSquaddieIds.forEach((targetSquaddieId: string) => {
        const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, targetSquaddieId));
        const resultPerTarget = result.resultPerTarget[targetSquaddieId];

        if (SquaddieSquaddieActionService.isHindering(currentAction)) {
            if (DegreeOfSuccessHelper.atLeastSuccessful(resultPerTarget.actorDegreeOfSuccess) !== true) {
                output.push(ActionResultTextWriter.getHinderingActionMissedString({squaddieTemplate: targetSquaddieTemplate}));
            } else if (resultPerTarget.damageTaken === 0) {
                output.push(ActionResultTextWriter.getHinderingActionDealtNoDamageString({squaddieTemplate: targetSquaddieTemplate}));
            } else {
                if (resultPerTarget.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
                    output.push(ActionResultTextWriter.getHinderingActionDealtCriticalDamageString({
                        squaddieTemplate: targetSquaddieTemplate,
                        damageTaken: resultPerTarget.damageTaken,
                    }));
                } else {
                    output.push(ActionResultTextWriter.getHinderingActionDealtDamageString({
                        squaddieTemplate: targetSquaddieTemplate,
                        damageTaken: resultPerTarget.damageTaken,
                    }));
                }
            }
        }
        if (SquaddieSquaddieActionService.isHelpful(currentAction)) {
            output.push(ActionResultTextWriter.getHelpfulActionHealingReceivedString({
                squaddieTemplate: targetSquaddieTemplate,
                healingReceived: resultPerTarget.healingReceived,
            }));
        }
    });

    return output;
}

export const FormatIntent = ({currentAction, actingBattleSquaddieId, squaddieRepository, actingSquaddieModifiers}: {
    currentAction: SquaddieSquaddieAction,
    actingBattleSquaddieId: string,
    squaddieRepository: ObjectRepository,
    actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number },
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, actingBattleSquaddieId))

    let output: string[] = [];
    output.push(`${actingSquaddieTemplate.squaddieId.name} uses ${currentAction.name}`);
    if (
        TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ATTACK) === true
        && TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ALWAYS_SUCCEEDS) !== true
    ) {
        output.push(...ActionResultText.getAttackPenaltyDescriptions(actingSquaddieModifiers));
    }

    return output;
}

export const ActionResultTextWriter = {
    getSquaddieUsesActionString: ({squaddieTemplate, action, newline}: {
        squaddieTemplate: SquaddieTemplate,
        action: SquaddieSquaddieAction,
        newline: boolean
    }): string => {
        return `${squaddieTemplate.squaddieId.name} uses${newline ? '\n' : ' '}${action.name}`;
    },
    getRollsDescriptionString: ({rolls, addSpacing}: { rolls: number[], addSpacing: boolean }): string => {
        return `${addSpacing ? '   ' : ''}rolls (${rolls[0]}, ${rolls[1]})`;
    },
    getHinderingActionMissedString: ({squaddieTemplate}: { squaddieTemplate: SquaddieTemplate }): string => {
        return `${squaddieTemplate.squaddieId.name}: MISS!`;
    },
    getHinderingActionDealtNoDamageString: ({squaddieTemplate}: { squaddieTemplate: SquaddieTemplate }): string => {
        return `${squaddieTemplate.squaddieId.name}: NO DAMAGE`;
    },
    getHinderingActionDealtDamageString: ({squaddieTemplate, damageTaken}: {
        squaddieTemplate: SquaddieTemplate,
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name} takes ${damageTaken} damage`;
    },
    getHinderingActionDealtCriticalDamageString: ({squaddieTemplate, damageTaken}: {
        squaddieTemplate: SquaddieTemplate,
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: CRITICAL HIT! ${damageTaken} damage`;
    },
    getHelpfulActionHealingReceivedString({squaddieTemplate, healingReceived}: {
        squaddieTemplate: SquaddieTemplate;
        healingReceived: number
    }): string {
        return `${squaddieTemplate.squaddieId.name} receives ${healingReceived} healing`;
    }
};
