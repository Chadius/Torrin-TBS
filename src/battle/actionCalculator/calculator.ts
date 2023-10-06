import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    DamageType,
    DealDamageToTheSquaddie,
    GiveHealingToTheSquaddie,
    HealingType
} from "../../squaddie/squaddieService";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";

export function CalculateResults(state: BattleOrchestratorState, actingSquaddieDynamic: BattleSquaddieDynamic, validTargetLocation: HexCoordinate) {
    const {
        dynamicSquaddieId: targetedSquaddieDynamicId,
        staticSquaddieId: targetedSquaddieStaticId
    } = state.missionMap.getSquaddieAtLocation(validTargetLocation);

    const {
        staticSquaddie: targetedSquaddieStatic,
        dynamicSquaddie: targetedSquaddieDynamic
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(targetedSquaddieDynamicId));
    const targetedSquaddieDynamicIds: string[] = [targetedSquaddieDynamicId];

    let healingReceived = calculateTotalHealingReceived(state, targetedSquaddieStatic, targetedSquaddieDynamic);
    let damageDealt = calculateTotalDamageDealt(state, targetedSquaddieStatic, targetedSquaddieDynamic);

    const resultPerTarget = {
        [targetedSquaddieDynamicId]: new ActionResultPerSquaddie({
            damageTaken: damageDealt,
            healingReceived,
        })
    };

    return new SquaddieSquaddieResults({
        actingSquaddieDynamicId: actingSquaddieDynamic.dynamicSquaddieId,
        targetedSquaddieDynamicIds,
        resultPerTarget,
    });
}

function calculateTotalDamageDealt(state: BattleOrchestratorState, targetedSquaddieStatic: BattleSquaddieStatic, targetedSquaddieDynamic: BattleSquaddieDynamic) {
    let damageDealt = 0;
    Object.keys(state.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions).forEach((damageType: DamageType) => {
        const rawDamageFromAction = state.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions[damageType]
        const {damageTaken: damageTakenByThisType} = DealDamageToTheSquaddie({
            staticSquaddie: targetedSquaddieStatic,
            dynamicSquaddie: targetedSquaddieDynamic,
            damage: rawDamageFromAction,
            damageType,
        });
        damageDealt += damageTakenByThisType;
    });
    return damageDealt;
}

function calculateTotalHealingReceived(state: BattleOrchestratorState, targetedSquaddieStatic: BattleSquaddieStatic, targetedSquaddieDynamic: BattleSquaddieDynamic) {
    let healingReceived = 0;
    if (state.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints) {
        ({healingReceived} = GiveHealingToTheSquaddie({
            staticSquaddie: targetedSquaddieStatic,
            dynamicSquaddie: targetedSquaddieDynamic,
            healingAmount: state.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints,
            healingType: HealingType.LostHitPoints,
        }));
    }
    return healingReceived;
}
