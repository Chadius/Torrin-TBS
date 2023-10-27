import {SquaddieActionData, SquaddieActionHandler} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export const FormatResult = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieActionData,
    result: SquaddieSquaddieResults,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(result.actingBattleSquaddieId))

    let output: string[] = [];
    output.push(`${actingSquaddieTemplate.squaddieId.name} uses ${currentAction.name}`);
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
    currentAction: SquaddieActionData,
    actingBattleSquaddieId: string,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(actingBattleSquaddieId))

    let output: string[] = [];
    output.push(`${actingSquaddieTemplate.squaddieId.name} uses ${currentAction.name}`);

    return output;
}
