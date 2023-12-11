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
import {ActionResultPerSquaddie, DegreeOfSuccess} from "../history/actionResultPerSquaddie";

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
    let {damageDealt, degreeOfSuccess} = calculateTotalDamageDealt({
        state,
        actingBattleSquaddie,
        targetedSquaddieTemplate,
        targetedBattleSquaddie,
        actingSquaddieRoll,
    });

    const resultPerTarget: { [id: string]: ActionResultPerSquaddie } = {
        [targetedBattleSquaddieId]: {
            healingReceived,
            damageTaken: damageDealt,
            actorDegreeOfSuccess: degreeOfSuccess,
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

const compareAttackRollToGetDegreeOfSuccess = ({
                                                   actor,
                                                   actingSquaddieRoll,
                                                   action,
                                                   target,
                                               }: {
    actor: BattleSquaddie;
    actingSquaddieRoll: { occurred: boolean; rolls: number[] };
    action: SquaddieAction;
    target: BattleSquaddie
}): DegreeOfSuccess => {
    if (TraitStatusStorageHelper.getStatus(action.traits, Trait.ALWAYS_SUCCEEDS)) {
        return DegreeOfSuccess.SUCCESS;
    }

    let totalAttackRoll = actingSquaddieRoll.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
    if (totalAttackRoll >= target.inBattleAttributes.armyAttributes.armorClass) {
        return DegreeOfSuccess.SUCCESS;
    } else {
        return DegreeOfSuccess.FAILURE;
    }
}

const calculateTotalDamageDealt = (
    {
        state,
        actingBattleSquaddie,
        targetedSquaddieTemplate,
        targetedBattleSquaddie,
        actingSquaddieRoll,
    }
        : {
        state: BattleOrchestratorState,
        targetedSquaddieTemplate: SquaddieTemplate,
        targetedBattleSquaddie: BattleSquaddie,
        actingBattleSquaddie: BattleSquaddie,
        actingSquaddieRoll: { occurred: boolean; rolls: number[] }
    }
): { damageDealt: number, degreeOfSuccess: DegreeOfSuccess } => {
    let damageDealt = 0;
    let degreeOfSuccess: DegreeOfSuccess = DegreeOfSuccess.NONE;

    const action = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;
    degreeOfSuccess = compareAttackRollToGetDegreeOfSuccess({
        action,
        actor: actingBattleSquaddie,
        target: targetedBattleSquaddie,
        actingSquaddieRoll,
    });

    Object.keys(action.damageDescriptions).forEach((damageType: DamageType) => {
        let rawDamageFromAction = action.damageDescriptions[damageType]
        if (degreeOfSuccess === DegreeOfSuccess.FAILURE) {
            rawDamageFromAction = 0;
        }

        const {damageTaken: damageTakenByThisType} = DealDamageToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            damage: rawDamageFromAction,
            damageType,
        });
        damageDealt += damageTakenByThisType;
    });
    return {
        damageDealt,
        degreeOfSuccess,
    };
};

function calculateTotalHealingReceived(state: BattleOrchestratorState, targetedSquaddieTemplate: SquaddieTemplate, targetedBattleSquaddie: BattleSquaddie) {
    let healingReceived = 0;
    if (state.battleState.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LOST_HIT_POINTS) {
        ({healingReceived} = GiveHealingToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            healingAmount: state.battleState.squaddieCurrentlyActing.currentlySelectedAction.healingDescriptions.LOST_HIT_POINTS,
            healingType: HealingType.LOST_HIT_POINTS,
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
    return TraitStatusStorageHelper.getStatus(action.traits, Trait.ALWAYS_SUCCEEDS) !== true;
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
