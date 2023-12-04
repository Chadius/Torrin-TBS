import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export const FormatResult = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieAction,
    result: SquaddieSquaddieResults,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(result.actingBattleSquaddieId))

    let output: string[] = [];
    let actorUsesActionDescriptionText = GetSquaddieUsesActionString({
        squaddieTemplate: actingSquaddieTemplate,
        action: currentAction,
        newline: false,
    });
    output.push(actorUsesActionDescriptionText);

    if (result.actingSquaddieRoll.occurred) {
        output.push(GetRollsDescriptionString({rolls: result.actingSquaddieRoll.rolls, addSpacing: true}));
    }

    result.targetedBattleSquaddieIds.forEach((targetSquaddieId: string) => {
        const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(targetSquaddieId));
        if (SquaddieActionHandler.isHindering(currentAction)) {
            output.push(`${targetSquaddieTemplate.squaddieId.name} takes ${result.resultPerTarget[targetSquaddieId].damageTaken} damage`);
        }
        if (SquaddieActionHandler.isHelpful(currentAction)) {
            output.push(`${targetSquaddieTemplate.squaddieId.name} receives ${result.resultPerTarget[targetSquaddieId].healingReceived} healing`);
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

export const GetSquaddieUsesActionString = ({squaddieTemplate, action, newline}: {
    squaddieTemplate: SquaddieTemplate,
    action: SquaddieAction,
    newline: boolean
}): string => {
    return `${squaddieTemplate.squaddieId.name} uses${newline ? '\n' : ' '}${action.name}`;
}

export const GetRollsDescriptionString = ({rolls, addSpacing}: { rolls: number[], addSpacing: boolean }): string => {
    return `${addSpacing ? '   ' : ''}rolls (${rolls[0]}, ${rolls[1]})`;
}
