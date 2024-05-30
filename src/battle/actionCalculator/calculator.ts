import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    DamageType,
    DealDamageToTheSquaddie,
    GiveHealingToTheSquaddie,
    HealingType,
} from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionStatisticsHandler } from "../missionStatistics/missionStatistics"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ActionResultPerSquaddie } from "../history/actionResultPerSquaddie"
import { DIE_SIZE, RollResult, RollResultService } from "./rollResult"
import { ObjectRepositoryService } from "../objectRepository"
import { ATTACK_MODIFIER } from "../modifierConstants"
import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { DecidedActionEffect } from "../../action/decided/decidedActionEffect"
import { isValidValue } from "../../utils/validityCheck"

export const ActionCalculator = {
    calculateResults: ({
        state,
        actingBattleSquaddie,
        validTargetLocation,
        actionEffect,
        actionsThisRound,
    }: {
        state: GameEngineState
        actingBattleSquaddie: BattleSquaddie
        validTargetLocation: HexCoordinate
        actionsThisRound: ActionsThisRound
        actionEffect: DecidedActionEffect
    }): SquaddieSquaddieResults => {
        return calculateResults({
            state,
            actingBattleSquaddie,
            validTargetLocation,
            actionsThisRound,
            actionEffect,
        })
    },
}

const calculateResults = ({
    state,
    actingBattleSquaddie,
    validTargetLocation,
    actionsThisRound,
    actionEffect,
}: {
    state: GameEngineState
    actingBattleSquaddie: BattleSquaddie
    validTargetLocation: HexCoordinate
    actionsThisRound: ActionsThisRound
    actionEffect: DecidedActionEffect
}): SquaddieSquaddieResults => {
    const { targetedBattleSquaddieIds } = getTargetedBattleSquaddieIds(
        state.battleOrchestratorState,
        validTargetLocation
    )

    let actingSquaddieRoll: RollResult
    if (actionEffect && actionEffect.type === ActionEffectType.SQUADDIE) {
        actingSquaddieRoll = maybeMakeAttackRoll(
            actionEffect.template,
            state.battleOrchestratorState
        )
    }
    let { multipleAttackPenalty } =
        ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(
            actionsThisRound
        )
    let actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number } = {}

    if (multipleAttackPenalty !== 0) {
        actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY] =
            multipleAttackPenalty
    }

    const resultPerTarget: { [id: string]: ActionResultPerSquaddie } = {}

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const {
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                state.repository,
                targetedBattleSquaddieId
            )
        )

        let healingReceived = calculateTotalHealingReceived({
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
            actionEffect: actionEffect,
        })

        let { damageDealt, degreeOfSuccess } = calculateTotalDamageDealt({
            actionEffect: actionEffect,
            state: state.battleOrchestratorState,
            actingBattleSquaddie,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
            actingSquaddieRoll,
            actingSquaddieModifierTotal: multipleAttackPenalty,
        })

        resultPerTarget[targetedBattleSquaddieId] = {
            healingReceived,
            damageTaken: damageDealt,
            actorDegreeOfSuccess: degreeOfSuccess,
        }

        maybeUpdateMissionStatistics(
            targetedSquaddieTemplate,
            state,
            healingReceived,
            damageDealt,
            actingBattleSquaddie
        )
    })

    return {
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        resultPerTarget,
        actingSquaddieRoll,
        actingSquaddieModifiers,
    }
}

const compareAttackRollToGetDegreeOfSuccess = ({
    actor,
    actingSquaddieRoll,
    actionEffectSquaddieTemplate,
    target,
    actingSquaddieModifierTotal,
}: {
    actor: BattleSquaddie
    actingSquaddieRoll: RollResult
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    target: BattleSquaddie
    actingSquaddieModifierTotal: number
}): DegreeOfSuccess => {
    if (
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        )
    ) {
        return DegreeOfSuccess.SUCCESS
    }

    const canCriticallySucceed: boolean = !TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.CANNOT_CRITICALLY_SUCCEED
    )
    if (
        RollResultService.isACriticalSuccess(actingSquaddieRoll) &&
        canCriticallySucceed
    ) {
        return DegreeOfSuccess.CRITICAL_SUCCESS
    }
    const canCriticallyFail: boolean = !TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.CANNOT_CRITICALLY_FAIL
    )
    if (
        RollResultService.isACriticalFailure(actingSquaddieRoll) &&
        canCriticallyFail
    ) {
        return DegreeOfSuccess.CRITICAL_FAILURE
    }

    let totalAttackRoll =
        RollResultService.totalAttackRoll(actingSquaddieRoll) +
        actingSquaddieModifierTotal
    if (
        canCriticallySucceed &&
        totalAttackRoll >=
            target.inBattleAttributes.armyAttributes.armorClass + DIE_SIZE
    ) {
        return DegreeOfSuccess.CRITICAL_SUCCESS
    } else if (
        totalAttackRoll >= target.inBattleAttributes.armyAttributes.armorClass
    ) {
        return DegreeOfSuccess.SUCCESS
    } else if (
        totalAttackRoll <=
        target.inBattleAttributes.armyAttributes.armorClass - DIE_SIZE
    ) {
        return DegreeOfSuccess.CRITICAL_FAILURE
    } else {
        return DegreeOfSuccess.FAILURE
    }
}

const calculateTotalDamageDealt = ({
    state,
    actingBattleSquaddie,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
    actingSquaddieRoll,
    actingSquaddieModifierTotal,
    actionEffect,
}: {
    state: BattleOrchestratorState
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actingSquaddieRoll: RollResult
    actingSquaddieModifierTotal: number
    actionEffect: DecidedActionEffect
}): { damageDealt: number; degreeOfSuccess: DegreeOfSuccess } => {
    let damageDealt = 0
    let degreeOfSuccess: DegreeOfSuccess = DegreeOfSuccess.NONE

    if (
        actionEffect === undefined ||
        actionEffect.type !== ActionEffectType.SQUADDIE
    ) {
        return { damageDealt: 0, degreeOfSuccess: DegreeOfSuccess.NONE }
    }
    const actionEffectSquaddieTemplate = actionEffect.template

    degreeOfSuccess = compareAttackRollToGetDegreeOfSuccess({
        actionEffectSquaddieTemplate,
        actor: actingBattleSquaddie,
        target: targetedBattleSquaddie,
        actingSquaddieRoll,
        actingSquaddieModifierTotal,
    })

    Object.keys(actionEffectSquaddieTemplate.damageDescriptions).forEach(
        (damageType: DamageType) => {
            let rawDamageFromAction =
                actionEffectSquaddieTemplate.damageDescriptions[damageType]
            if (degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
                rawDamageFromAction *= 2
            }
            if (DegreeOfSuccessService.atBestFailure(degreeOfSuccess)) {
                rawDamageFromAction = 0
            }

            const { damageTaken: damageTakenByThisType } =
                DealDamageToTheSquaddie({
                    squaddieTemplate: targetedSquaddieTemplate,
                    battleSquaddie: targetedBattleSquaddie,
                    damage: rawDamageFromAction,
                    damageType,
                })
            damageDealt += damageTakenByThisType
        }
    )
    return {
        damageDealt,
        degreeOfSuccess,
    }
}

const calculateTotalHealingReceived = ({
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
    actionEffect,
}: {
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
    actionEffect: DecidedActionEffect
}) => {
    if (!isValidValue(actionEffect)) {
        return 0
    }
    if (actionEffect.type !== ActionEffectType.SQUADDIE) {
        return 0
    }

    let healingReceived = 0
    const actionEffectSquaddieTemplate = actionEffect.template

    if (actionEffectSquaddieTemplate.healingDescriptions.LOST_HIT_POINTS) {
        ;({ healingReceived } = GiveHealingToTheSquaddie({
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
            healingAmount:
                actionEffectSquaddieTemplate.healingDescriptions
                    .LOST_HIT_POINTS,
            healingType: HealingType.LOST_HIT_POINTS,
        }))
    }
    return healingReceived
}

function maybeUpdateMissionStatistics(
    targetedSquaddieTemplate: SquaddieTemplate,
    state: GameEngineState,
    healingReceived: number,
    damageDealt: number,
    actingBattleSquaddie: BattleSquaddie
) {
    if (
        targetedSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsHandler.addHealingReceivedByPlayerTeam(
            state.battleOrchestratorState.battleState.missionStatistics,
            healingReceived
        )
        MissionStatisticsHandler.addDamageTakenByPlayerTeam(
            state.battleOrchestratorState.battleState.missionStatistics,
            damageDealt
        )
    }

    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            actingBattleSquaddie.battleSquaddieId
        )
    )
    if (
        actingSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(
            state.battleOrchestratorState.battleState.missionStatistics,
            damageDealt
        )
    }
}

function doesActionNeedAnAttackRoll(
    action: ActionEffectSquaddieTemplate
): boolean {
    return (
        TraitStatusStorageService.getStatus(
            action.traits,
            Trait.ALWAYS_SUCCEEDS
        ) !== true
    )
}

function conformToSixSidedDieRoll(numberGeneratorResult: number): number {
    const inRangeNumber = numberGeneratorResult % DIE_SIZE
    return inRangeNumber === 0 ? DIE_SIZE : inRangeNumber
}

const maybeMakeAttackRoll = (
    squaddieAction: ActionEffectSquaddieTemplate,
    state: BattleOrchestratorState
): RollResult => {
    if (doesActionNeedAnAttackRoll(squaddieAction)) {
        const attackRoll = [
            conformToSixSidedDieRoll(state.numberGenerator.next()),
            conformToSixSidedDieRoll(state.numberGenerator.next()),
        ]
        return RollResultService.new({
            occurred: true,
            rolls: [...attackRoll],
        })
    }
    return RollResultService.new({
        occurred: false,
        rolls: [],
    })
}

function getTargetedBattleSquaddieIds(
    state: BattleOrchestratorState,
    validTargetLocation: HexCoordinate
) {
    const {
        battleSquaddieId: targetedBattleSquaddieId,
        squaddieTemplateId: targetedSquaddieTemplateId,
    } = state.battleState.missionMap.getSquaddieAtLocation(validTargetLocation)
    const targetedBattleSquaddieIds: string[] = [targetedBattleSquaddieId]
    return { targetedBattleSquaddieIds }
}
