import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export const FormatResult = ({currentActivity, result, squaddieRepository}: {
    currentActivity: SquaddieActivity,
    result: SquaddieSquaddieResults,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {staticSquaddie: actingStaticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(result.actingSquaddieDynamicId))

    let output: string[] = [];
    output.push(`${actingStaticSquaddie.squaddieId.name} uses ${currentActivity.name}`);
    result.targetedSquaddieDynamicIds.forEach((targetSquaddieId: string) => {
        const {staticSquaddie: targetSquaddieStatic} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(targetSquaddieId));
        output.push(`${targetSquaddieStatic.squaddieId.name} takes ${result.resultPerTarget[targetSquaddieId].damageTaken} damage`);
    });

    return output;
}

export const FormatIntent = ({currentActivity, actingDynamicId, squaddieRepository}: {
    currentActivity: SquaddieActivity,
    actingDynamicId: string,
    squaddieRepository: BattleSquaddieRepository,
}): string[] => {
    const {staticSquaddie: actingStaticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(actingDynamicId))

    let output: string[] = [];
    output.push(`${actingStaticSquaddie.squaddieId.name} uses ${currentActivity.name}`);

    return output;
}
