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
import {SquaddieSquaddieAction} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {DIE_SIZE, RollResult, RollResultService} from "./rollResult";
import {ObjectRepositoryHelper} from "../objectRepository";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {ATTACK_MODIFIER} from "../modifierConstants";
import {DegreeOfSuccess, DegreeOfSuccessService} from "./degreeOfSuccess";

export const ActionCalculator = {
    calculateResults: ({
                           state,
                           actingBattleSquaddie,
                           validTargetLocation,
                       }: {
                           state: BattleOrchestratorState,
                           actingBattleSquaddie: BattleSquaddie,
                           validTargetLocation: HexCoordinate
                       }
    ): SquaddieSquaddieResults => {
        return calculateResults({state, actingBattleSquaddie, validTargetLocation});
    }
}

function calculateResults({
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
        targetedBattleSquaddieIds
    } = getTargetedBattleSquaddieIds(state, validTargetLocation);

    let actingSquaddieRoll: RollResult = maybeMakeAttackRoll(state.battleState.squaddieCurrentlyActing.currentlySelectedAction, state);
    let {multipleAttackPenalty} = SquaddieActionsForThisRoundHandler.currentMultipleAttackPenalty(state.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound);
    let actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number } = {};

    if (multipleAttackPenalty !== 0) {
        actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY] = multipleAttackPenalty;
    }

    const resultPerTarget: { [id: string]: ActionResultPerSquaddie } = {};

    targetedBattleSquaddieIds.forEach(targetedBattleSquaddieId => {
        const {
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository, targetedBattleSquaddieId));

        let healingReceived = calculateTotalHealingReceived(state, targetedSquaddieTemplate, targetedBattleSquaddie);
        let {damageDealt, degreeOfSuccess} = calculateTotalDamageDealt({
            state,
            actingBattleSquaddie,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
            actingSquaddieRoll,
            actingSquaddieModifierTotal: multipleAttackPenalty,
        });

        resultPerTarget[targetedBattleSquaddieId] = {
            healingReceived,
            damageTaken: damageDealt,
            actorDegreeOfSuccess: degreeOfSuccess,
        };

        maybeUpdateMissionStatistics(targetedSquaddieTemplate, state, healingReceived, damageDealt, actingBattleSquaddie);
    });

    return {
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        resultPerTarget,
        actingSquaddieRoll,
        actingSquaddieModifiers,
    };
}

const compareAttackRollToGetDegreeOfSuccess = ({
                                                   actor,
                                                   actingSquaddieRoll,
                                                   action,
                                                   target,
                                                   actingSquaddieModifierTotal,
                                               }: {
    actor: BattleSquaddie;
    actingSquaddieRoll: RollResult;
    action: SquaddieSquaddieAction;
    target: BattleSquaddie;
    actingSquaddieModifierTotal: number,
}): DegreeOfSuccess => {
    if (TraitStatusStorageHelper.getStatus(action.traits, Trait.ALWAYS_SUCCEEDS)) {
        return DegreeOfSuccess.SUCCESS;
    }

    const canCriticallySucceed: boolean = !TraitStatusStorageHelper.getStatus(action.traits, Trait.CANNOT_CRITICALLY_SUCCEED);
    if (RollResultService.isACriticalSuccess(actingSquaddieRoll) && canCriticallySucceed) {
        return DegreeOfSuccess.CRITICAL_SUCCESS;
    }
    const canCriticallyFail: boolean = !TraitStatusStorageHelper.getStatus(action.traits, Trait.CANNOT_CRITICALLY_FAIL);
    if (RollResultService.isACriticalFailure(actingSquaddieRoll) && canCriticallyFail) {
        return DegreeOfSuccess.CRITICAL_FAILURE;
    }

    let totalAttackRoll = RollResultService.totalAttackRoll(actingSquaddieRoll) + actingSquaddieModifierTotal;
    if (canCriticallySucceed && totalAttackRoll >= target.inBattleAttributes.armyAttributes.armorClass + DIE_SIZE) {
        return DegreeOfSuccess.CRITICAL_SUCCESS;
    } else if (totalAttackRoll >= target.inBattleAttributes.armyAttributes.armorClass) {
        return DegreeOfSuccess.SUCCESS;
    } else if (totalAttackRoll <= target.inBattleAttributes.armyAttributes.armorClass - DIE_SIZE) {
        return DegreeOfSuccess.CRITICAL_FAILURE;
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
        actingSquaddieModifierTotal,
    }
        : {
        state: BattleOrchestratorState,
        targetedSquaddieTemplate: SquaddieTemplate,
        targetedBattleSquaddie: BattleSquaddie,
        actingBattleSquaddie: BattleSquaddie,
        actingSquaddieRoll: RollResult,
        actingSquaddieModifierTotal: number,
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
        actingSquaddieModifierTotal,
    });

    Object.keys(action.damageDescriptions).forEach((damageType: DamageType) => {
        let rawDamageFromAction = action.damageDescriptions[damageType]
        if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
            rawDamageFromAction *= 2;
        }
        if (DegreeOfSuccessService.atBestFailure(degreeOfSuccess)) {
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

    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository, actingBattleSquaddie.battleSquaddieId));
    if (actingSquaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER) {
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(state.battleState.missionStatistics, damageDealt);
    }
}

function doesActionNeedAnAttackRoll(action: SquaddieSquaddieAction): boolean {
    return TraitStatusStorageHelper.getStatus(action.traits, Trait.ALWAYS_SUCCEEDS) !== true;
}

function conformToSixSidedDieRoll(numberGeneratorResult: number): number {
    const inRangeNumber = numberGeneratorResult % DIE_SIZE;
    return inRangeNumber === 0 ? DIE_SIZE : inRangeNumber;
}

const maybeMakeAttackRoll = (squaddieAction: SquaddieSquaddieAction, state: BattleOrchestratorState): RollResult => {
    if (doesActionNeedAnAttackRoll(squaddieAction)) {
        const attackRoll = [
            conformToSixSidedDieRoll(state.numberGenerator.next()),
            conformToSixSidedDieRoll(state.numberGenerator.next()),
        ];
        return RollResultService.new({
            occurred: true,
            rolls: [...attackRoll],
        });
    }
    return RollResultService.new({
        occurred: false,
        rolls: [],
    });
}

function getTargetedBattleSquaddieIds(state: BattleOrchestratorState, validTargetLocation: HexCoordinate) {
    const {
        battleSquaddieId: targetedBattleSquaddieId,
        squaddieTemplateId: targetedSquaddieTemplateId
    } = state.battleState.missionMap.getSquaddieAtLocation(validTargetLocation);
    const targetedBattleSquaddieIds: string[] = [targetedBattleSquaddieId];
    return {targetedBattleSquaddieIds};
}
