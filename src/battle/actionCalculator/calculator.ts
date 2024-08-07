import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    DamageType,
    HealingType,
    SquaddieService,
} from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionStatisticsHandler } from "../missionStatistics/missionStatistics"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../history/squaddieSquaddieResults"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
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
import { MissionMapService } from "../../missionMap/missionMap"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../history/battleActionSquaddieChange"
import { BattleActionActionContextService } from "../history/battleAction"
import { AttributeModifier } from "../../squaddie/attributeModifier"

export const ActionCalculator = {
    calculateResults: ({
        gameEngineState,
        actingBattleSquaddie,
        validTargetLocation,
        actionEffect,
        actionsThisRound,
    }: {
        gameEngineState: GameEngineState
        actingBattleSquaddie: BattleSquaddie
        validTargetLocation: HexCoordinate
        actionsThisRound: ActionsThisRound
        actionEffect: DecidedActionEffect
    }): SquaddieSquaddieResults => {
        return calculateResults({
            gameEngineState: gameEngineState,
            actingBattleSquaddie,
            validTargetLocation,
            actionsThisRound,
            actionEffect,
        })
    },
    getBattleActionSquaddieChange: ({
        gameEngineState,
        targetBattleSquaddieId,
    }: {
        gameEngineState: GameEngineState
        targetBattleSquaddieId: string
    }): BattleActionSquaddieChange => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                targetBattleSquaddieId
            )
        )
        return {
            battleSquaddieId: targetBattleSquaddieId,
            attributesBefore: InBattleAttributesService.clone(
                battleSquaddie.inBattleAttributes
            ),
            attributesAfter: undefined,
            damageTaken: 0,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.NONE,
        }
    },
    getBattleSquaddieIdsAtGivenLocations: ({
        gameEngineState,
        locations,
    }: {
        locations: { q: number; r: number }[]
        gameEngineState: GameEngineState
    }): string[] => {
        return getBattleSquaddieIdsAtGivenLocations({
            gameEngineState,
            locations,
        })
    },
}

const calculateResults = ({
    gameEngineState,
    actingBattleSquaddie,
    validTargetLocation,
    actionsThisRound,
    actionEffect,
}: {
    gameEngineState: GameEngineState
    actingBattleSquaddie: BattleSquaddie
    validTargetLocation: HexCoordinate
    actionsThisRound: ActionsThisRound
    actionEffect: DecidedActionEffect
}): SquaddieSquaddieResults => {
    const targetedBattleSquaddieIds = getBattleSquaddieIdsAtGivenLocations({
        gameEngineState,
        locations: [validTargetLocation],
    })

    let actingSquaddieRoll: RollResult
    if (actionEffect && actionEffect.type === ActionEffectType.SQUADDIE) {
        actingSquaddieRoll = maybeMakeAttackRoll(
            actionEffect.template,
            gameEngineState.battleOrchestratorState
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

    const resultPerTarget: BattleActionSquaddieChange[] = []

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const {
            squaddieTemplate: targetedSquaddieTemplate,
            battleSquaddie: targetedBattleSquaddie,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                targetedBattleSquaddieId
            )
        )

        const changes = ActionCalculator.getBattleActionSquaddieChange({
            gameEngineState,
            targetBattleSquaddieId: targetedBattleSquaddieId,
        })

        let healingReceived = calculateTotalHealingReceived({
            targetedBattleSquaddie,
            actionEffect: actionEffect,
        })

        let { damageDealt, degreeOfSuccess } = calculateTotalDamageDealt({
            actionEffect: actionEffect,
            state: gameEngineState.battleOrchestratorState,
            actingBattleSquaddie,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
            actingSquaddieRoll,
            actingSquaddieModifierTotal: multipleAttackPenalty,
        })

        let attributeModifiers: AttributeModifier[] =
            calculateAttributeModifiers({
                gameEngineState,
                actionEffect,
                actingBattleSquaddie,
                targetedBattleSquaddie,
            })

        applyChangesToSquaddie({
            targetedBattleSquaddie,
            calculatedDamageTaken: damageDealt,
            calculatedHealingReceived: healingReceived,
            attributeModifiers,
        })

        changes.attributesAfter = InBattleAttributesService.clone(
            targetedBattleSquaddie.inBattleAttributes
        )

        resultPerTarget.push(
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: targetedBattleSquaddieId,
                healingReceived,
                damageTaken: damageDealt,
                actorDegreeOfSuccess: degreeOfSuccess,
                attributesBefore: changes.attributesBefore,
                attributesAfter: changes.attributesAfter,
            })
        )

        maybeUpdateMissionStatistics(
            targetedSquaddieTemplate,
            gameEngineState,
            healingReceived,
            damageDealt,
            actingBattleSquaddie
        )
    })

    return SquaddieSquaddieResultsService.new({
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        squaddieChanges: resultPerTarget,
        actionContext: BattleActionActionContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
        }),
    })
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
                SquaddieService.calculateDealtDamageToTheSquaddie({
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

const applyChangesToSquaddie = ({
    targetedBattleSquaddie,
    calculatedDamageTaken,
    calculatedHealingReceived,
    attributeModifiers,
}: {
    targetedBattleSquaddie: BattleSquaddie
    calculatedDamageTaken: number
    calculatedHealingReceived: number
    attributeModifiers: AttributeModifier[]
}) => {
    InBattleAttributesService.takeDamage(
        targetedBattleSquaddie.inBattleAttributes,
        calculatedDamageTaken,
        DamageType.UNKNOWN
    )
    InBattleAttributesService.receiveHealing(
        targetedBattleSquaddie.inBattleAttributes,
        calculatedHealingReceived
    )
    attributeModifiers.forEach((modifier) =>
        InBattleAttributesService.addActiveAttributeModifier(
            targetedBattleSquaddie.inBattleAttributes,
            modifier
        )
    )
}

const calculateTotalHealingReceived = ({
    targetedBattleSquaddie,
    actionEffect,
}: {
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
        ;({ healingReceived } =
            SquaddieService.calculateGiveHealingToTheSquaddie({
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

const getBattleSquaddieIdsAtGivenLocations = ({
    gameEngineState,
    locations,
}: {
    locations: { q: number; r: number }[]
    gameEngineState: GameEngineState
}): string[] => {
    return locations
        .map((location) =>
            MissionMapService.getBattleSquaddieAtLocation(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                location
            )
        )
        .filter(MissionMapSquaddieLocationService.isValid)
        .map(
            (battleSquaddieLocation) => battleSquaddieLocation.battleSquaddieId
        )
}

const calculateAttributeModifiers = ({
    actingBattleSquaddie,
    actionEffect,
    gameEngineState,
    targetedBattleSquaddie,
}: {
    actingBattleSquaddie: BattleSquaddie
    actionEffect: DecidedActionEffect
    gameEngineState: GameEngineState
    targetedBattleSquaddie: BattleSquaddie
}): AttributeModifier[] => {
    if (actionEffect.type !== ActionEffectType.SQUADDIE) {
        return []
    }

    if (!isValidValue(actionEffect.template.attributeModifiers)) {
        return []
    }

    return [...actionEffect.template.attributeModifiers]
}
