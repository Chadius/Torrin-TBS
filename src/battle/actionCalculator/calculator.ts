import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
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
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export function CalculateResults(state: BattleOrchestratorState, actingBattleSquaddie: BattleSquaddie, validTargetLocation: HexCoordinate) {
    const {
        battleSquaddieId: targetedBattleSquaddieId,
        squaddieTemplateId: targetedSquaddieTemplateId
    } = state.missionMap.getSquaddieAtLocation(validTargetLocation);

    const {
        squaddieTemplate: targetedSquaddieTemplate,
        battleSquaddie: targetedBattleSquaddie
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(targetedBattleSquaddieId));
    const targetedBattleSquaddieIds: string[] = [targetedBattleSquaddieId];

    let healingReceived = calculateTotalHealingReceived(state, targetedSquaddieTemplate, targetedBattleSquaddie);
    let damageDealt = calculateTotalDamageDealt(state, targetedSquaddieTemplate, targetedBattleSquaddie);

    const resultPerTarget = {
        [targetedBattleSquaddieId]: new ActionResultPerSquaddie({
            damageTaken: damageDealt,
            healingReceived,
        })
    };

    return new SquaddieSquaddieResults({
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        resultPerTarget,
    });
}

function calculateTotalDamageDealt(state: BattleOrchestratorState, targetedSquaddieTemplate: SquaddieTemplate, targetedBattleSquaddie: BattleSquaddie) {
    let damageDealt = 0;
    Object.keys(state.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions).forEach((damageType: DamageType) => {
        const rawDamageFromAction = state.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions[damageType]
        const {damageTaken: damageTakenByThisType} = DealDamageToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            damage: rawDamageFromAction,
            damageType,
        });
        damageDealt += damageTakenByThisType;
    });
    return damageDealt;
}

function calculateTotalHealingReceived(state: BattleOrchestratorState, targetedSquaddieTemplate: SquaddieTemplate, targetedBattleSquaddie: BattleSquaddie) {
    let healingReceived = 0;
    if (state.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints) {
        ({healingReceived} = GiveHealingToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            healingAmount: state.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints,
            healingType: HealingType.LostHitPoints,
        }));
    }
    return healingReceived;
}
