import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {DegreeOfSuccess, DegreeOfSuccessHelper} from "../history/actionResultPerSquaddie";

export const FormatResult = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieAction,
    result: SquaddieSquaddieResults,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(result.actingBattleSquaddieId))

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
    }

    result.targetedBattleSquaddieIds.forEach((targetSquaddieId: string) => {
        const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(targetSquaddieId));
        const resultPerTarget = result.resultPerTarget[targetSquaddieId];

        if (SquaddieActionHandler.isHindering(currentAction)) {
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
        if (SquaddieActionHandler.isHelpful(currentAction)) {
            output.push(ActionResultTextWriter.getHelpfulActionHealingReceivedString({
                squaddieTemplate: targetSquaddieTemplate,
                healingReceived: resultPerTarget.healingReceived,
            }));
        }
    });

    return output;
}

export const FormatIntent = ({currentAction, actingBattleSquaddieId, squaddieRepository}: {
    currentAction: SquaddieAction,
    actingBattleSquaddieId: string,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(actingBattleSquaddieId))

    let output: string[] = [];
    output.push(`${actingSquaddieTemplate.squaddieId.name} uses ${currentAction.name}`);

    return output;
}

export const ActionResultTextWriter = {
    getSquaddieUsesActionString: ({squaddieTemplate, action, newline}: {
        squaddieTemplate: SquaddieTemplate,
        action: SquaddieAction,
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
