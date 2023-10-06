import {SquaddieAction} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export const FormatResult = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieAction,
    result: SquaddieSquaddieResults,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {staticSquaddie: actingStaticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(result.actingSquaddieDynamicId))

    let output: string[] = [];
    output.push(`${actingStaticSquaddie.squaddieId.name} uses ${currentAction.name}`);
    result.targetedSquaddieDynamicIds.forEach((targetSquaddieId: string) => {
        const {staticSquaddie: targetSquaddieStatic} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(targetSquaddieId));
        if (currentAction.isHindering) {
            output.push(`${targetSquaddieStatic.squaddieId.name} takes ${result.resultPerTarget[targetSquaddieId].damageTaken} damage`);
        }
        if (currentAction.isHelpful) {
            output.push(`${targetSquaddieStatic.squaddieId.name} receives ${result.resultPerTarget[targetSquaddieId].healingReceived} healing`);
        }
    });

    return output;
}

export const FormatIntent = ({currentAction, actingDynamicId, squaddieRepository}: {
    currentAction: SquaddieAction,
    actingDynamicId: string,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {staticSquaddie: actingStaticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(actingDynamicId))

    let output: string[] = [];
    output.push(`${actingStaticSquaddie.squaddieId.name} uses ${currentAction.name}`);

    return output;
}
