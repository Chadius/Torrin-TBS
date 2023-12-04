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
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {SquaddieAction} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";

export function CalculateResults({
                                     state,
                                     actingBattleSquaddie,
                                     validTargetLocation,
                                 }: {
                                     state: BattleOrchestratorState,
                                     actingBattleSquaddie: BattleSquaddie,
                                     validTargetLocation: HexCoordinate
                                 }
): SquaddieSquaddieResults {
    const {
        battleSquaddieId: targetedBattleSquaddieId,
        squaddieTemplateId: targetedSquaddieTemplateId
    } = state.battleState.missionMap.getSquaddieAtLocation(validTargetLocation);

    const squaddieAction = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;

    const {
        squaddieTemplate: targetedSquaddieTemplate,
        battleSquaddie: targetedBattleSquaddie
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(targetedBattleSquaddieId));
    const targetedBattleSquaddieIds: string[] = [targetedBattleSquaddieId];

    let actingSquaddieRoll: { occurred: boolean; rolls: number[] } = maybeMakeAttackRoll(squaddieAction, state);

    let healingReceived = calculateTotalHealingReceived(state, targetedSquaddieTemplate, targetedBattleSquaddie);
    let damageDealt = calculateTotalDamageDealt(state, targetedSquaddieTemplate, targetedBattleSquaddie);

    const resultPerTarget = {
        [targetedBattleSquaddieId]: {
            healingReceived,
            damageTaken: damageDealt,
        }
    };

    maybeUpdateMissionStatistics(targetedSquaddieTemplate, state, healingReceived, damageDealt, actingBattleSquaddie);

    return {
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        resultPerTarget,
        actingSquaddieRoll,
    };
}

function calculateTotalDamageDealt(state: BattleOrchestratorState, targetedSquaddieTemplate: SquaddieTemplate, targetedBattleSquaddie: BattleSquaddie) {
    let damageDealt = 0;
    Object.keys(state.battleState.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions).forEach((damageType: DamageType) => {
        const rawDamageFromAction = state.battleState.squaddieCurrentlyActing.currentlySelectedAction.damageDescriptions[damageType]
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
    if (state.battleState.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints) {
        ({healingReceived} = GiveHealingToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            healingAmount: state.battleState.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LostHitPoints,
            healingType: HealingType.LostHitPoints,
        }));
    }
    return healingReceived;
}

function maybeUpdateMissionStatistics(targetedSquaddieTemplate: SquaddieTemplate, state: BattleOrchestratorState, healingReceived: number, damageDealt: number, actingBattleSquaddie: BattleSquaddie) {
    if (targetedSquaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER) {
        MissionStatisticsHandler.addHealingReceivedByPlayerTeam(state.battleState.missionStatistics, healingReceived);
        MissionStatisticsHandler.addDamageTakenByPlayerTeam(state.battleState.missionStatistics, damageDealt);
    }

    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId));
    if (actingSquaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER) {
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(state.battleState.missionStatistics, damageDealt);
    }
}

function doesActionNeedAnAttackRoll(action: SquaddieAction): boolean {
    return TraitStatusStorageHelper.getStatus(action.traits, Trait.ALWAYS_HITS) !== true;
}

function conformToSixSidedDieRoll(numberGeneratorResult: number): number {
    const inRangeNumber = numberGeneratorResult % 6;
    return inRangeNumber === 0 ? 6 : inRangeNumber;
}

function maybeMakeAttackRoll(squaddieAction: SquaddieAction, state: BattleOrchestratorState): {
    occurred: boolean;
    rolls: number[]
} {
    if (doesActionNeedAnAttackRoll(squaddieAction)) {
        const attackRoll = [
            conformToSixSidedDieRoll(state.numberGenerator.next()),
            conformToSixSidedDieRoll(state.numberGenerator.next()),
        ];
        return {
            occurred: true,
            rolls: [...attackRoll],
        };
    }
    return {
        occurred: false,
        rolls: [],
    };
}
