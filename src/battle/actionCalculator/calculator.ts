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
import { ACTOR_MODIFIER } from "../modifierConstants"
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
import {
    AttributeModifier,
    AttributeType,
} from "../../squaddie/attributeModifier"
import { CalculateAgainstArmor } from "./calculateAgainstArmor"
import { DecidedActionSquaddieEffect } from "../../action/decided/decidedActionSquaddieEffect"
import { DecidedActionMovementEffect } from "../../action/decided/decidedActionMovementEffect"
import { DecidedActionEndTurnEffect } from "../../action/decided/decidedActionEndTurnEffect"

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

const getActingSquaddieModifiers = (actionsThisRound: ActionsThisRound) => {
    let { multipleAttackPenalty } =
        ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(
            actionsThisRound
        )
    let actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number } = {}

    if (multipleAttackPenalty !== 0) {
        actingSquaddieModifiers[ACTOR_MODIFIER.MULTIPLE_ATTACK_PENALTY] =
            multipleAttackPenalty
    }
    return actingSquaddieModifiers
}

const calculateAndApplyResultToTarget = (
    gameEngineState: GameEngineState,
    targetedBattleSquaddieId: string,
    actionEffect:
        | DecidedActionSquaddieEffect
        | DecidedActionMovementEffect
        | DecidedActionEndTurnEffect,
    targetSquaddieModifiers: {
        [p: string]: { [modifier in AttributeType]?: number }
    },
    actingBattleSquaddie: BattleSquaddie,
    actingSquaddieRoll: RollResult,
    actingSquaddieModifierTotal: number
) => {
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

    let targetSquaddieModifierTotal: number = 0
    let targetSquaddieModifiersForThisSquaddie: {
        [modifier in AttributeType]?: number
    } = {}

    if (isActionAgainstArmor(actionEffect)) {
        ;({
            modifiers: targetSquaddieModifiersForThisSquaddie,
            modifierTotal: targetSquaddieModifierTotal,
        } = CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            targetedBattleSquaddie
        ))
    }

    targetSquaddieModifiers[targetedBattleSquaddieId] =
        targetSquaddieModifiersForThisSquaddie

    let { damageDealt, degreeOfSuccess } =
        calculateTotalDamageDealtForAttackRoll({
            actionEffect,
            state: gameEngineState.battleOrchestratorState,
            actingBattleSquaddie,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
            actingSquaddieRoll,
            actingSquaddieModifierTotal,
            targetSquaddieModifierTotal,
        })

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffect,
        })

    applyChangesToSquaddie({
        targetedBattleSquaddie,
        calculatedDamageTaken: damageDealt,
        calculatedHealingReceived: healingReceived,
        attributeModifiers: attributeModifiersToAddToTarget,
    })

    changes.attributesAfter = InBattleAttributesService.clone(
        targetedBattleSquaddie.inBattleAttributes
    )

    return BattleActionSquaddieChangeService.new({
        battleSquaddieId: targetedBattleSquaddieId,
        healingReceived,
        damageTaken: damageDealt,
        actorDegreeOfSuccess: degreeOfSuccess,
        attributesBefore: changes.attributesBefore,
        attributesAfter: changes.attributesAfter,
    })
}

const calculateIfAttack = ({
    actionEffect,
    gameEngineState,
    validTargetLocation,
    actionsThisRound,
    actingBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    gameEngineState: GameEngineState
    validTargetLocation: HexCoordinate
    actionsThisRound: ActionsThisRound
    actingBattleSquaddie: BattleSquaddie
}) => {
    let actingSquaddieRoll: RollResult
    actingSquaddieRoll = maybeMakeAttackRoll(
        actionEffect.template,
        gameEngineState.battleOrchestratorState
    )

    const targetedBattleSquaddieIds = getBattleSquaddieIdsAtGivenLocations({
        gameEngineState,
        locations: [validTargetLocation],
    })

    let actingSquaddieModifiers = getActingSquaddieModifiers(actionsThisRound)
    let actingSquaddieModifierTotal: number = Object.values(
        actingSquaddieModifiers
    ).reduce((previousValue: number, currentValue: number) => {
        return previousValue + currentValue
    }, 0)

    const resultPerTarget: BattleActionSquaddieChange[] = []
    const targetSquaddieModifiers: {
        [squaddieId: string]: { [modifier in AttributeType]?: number }
    } = {}

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const result: BattleActionSquaddieChange =
            calculateAndApplyResultToTarget(
                gameEngineState,
                targetedBattleSquaddieId,
                actionEffect,
                targetSquaddieModifiers,
                actingBattleSquaddie,
                actingSquaddieRoll,
                actingSquaddieModifierTotal
            )

        resultPerTarget.push(result)
        maybeUpdateMissionStatistics({
            result,
            gameEngineState,
            actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        })
    })

    return SquaddieSquaddieResultsService.new({
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        squaddieChanges: resultPerTarget,
        actionContext: BattleActionActionContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers,
        }),
    })
}

const calculateIfNotAnAttack = ({
    actionEffect,
    gameEngineState,
    validTargetLocation,
    actingBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    gameEngineState: GameEngineState
    validTargetLocation: HexCoordinate
    actingBattleSquaddie: BattleSquaddie
}) => {
    let actingSquaddieRoll: RollResult = RollResultService.new({
        occurred: false,
        rolls: [],
    })

    const targetedBattleSquaddieIds = getBattleSquaddieIdsAtGivenLocations({
        gameEngineState,
        locations: [validTargetLocation],
    })

    const resultPerTarget: BattleActionSquaddieChange[] = []

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const result: BattleActionSquaddieChange =
            calculateAndApplyResultToTarget(
                gameEngineState,
                targetedBattleSquaddieId,
                actionEffect,
                {},
                actingBattleSquaddie,
                actingSquaddieRoll,
                0
            )

        resultPerTarget.push(result)
        maybeUpdateMissionStatistics({
            result,
            gameEngineState,
            actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        })
    })

    return SquaddieSquaddieResultsService.new({
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        squaddieChanges: resultPerTarget,
        actionContext: BattleActionActionContextService.new({
            actingSquaddieModifiers: {},
            actingSquaddieRoll,
            targetSquaddieModifiers: Object.fromEntries(
                targetedBattleSquaddieIds.map((battleSquaddieId) => [
                    battleSquaddieId,
                    {},
                ])
            ),
        }),
    })
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
    if (actionEffect?.type !== ActionEffectType.SQUADDIE) {
        return
    }

    if (isAnAttack(actionEffect)) {
        return calculateIfAttack({
            actionEffect,
            gameEngineState,
            validTargetLocation,
            actionsThisRound,
            actingBattleSquaddie,
        })
    }

    return calculateIfNotAnAttack({
        actionEffect,
        gameEngineState,
        validTargetLocation,
        actingBattleSquaddie,
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

const calculateTotalDamageDealtForAttackRoll = ({
    state,
    actingBattleSquaddie,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
    actingSquaddieRoll,
    actingSquaddieModifierTotal,
    targetSquaddieModifierTotal,
    actionEffect,
}: {
    state: BattleOrchestratorState
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actingSquaddieRoll: RollResult
    actingSquaddieModifierTotal: number
    targetSquaddieModifierTotal: number
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
        actingSquaddieModifierTotal:
            actingSquaddieModifierTotal - targetSquaddieModifierTotal,
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

const maybeUpdateMissionStatistics = ({
    result,
    gameEngineState,
    actingBattleSquaddieId,
}: {
    result: BattleActionSquaddieChange
    gameEngineState: GameEngineState
    actingBattleSquaddieId: string
}) => {
    const { squaddieTemplate: targetedSquaddieTemplate } =
        getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                result.battleSquaddieId
            )
        )
    const healingReceived: number = result.healingReceived
    const damageDealt: number = result.damageTaken

    if (
        targetedSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsHandler.addHealingReceivedByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            healingReceived
        )
        MissionStatisticsHandler.addDamageTakenByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            damageDealt
        )
    }

    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actingBattleSquaddieId
        )
    )
    if (
        actingSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
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
    actionEffect,
}: {
    actionEffect: DecidedActionEffect
}): AttributeModifier[] => {
    if (actionEffect.type !== ActionEffectType.SQUADDIE) {
        return []
    }

    if (!isValidValue(actionEffect.template.attributeModifiers)) {
        return []
    }

    return [...actionEffect.template.attributeModifiers]
}

const isActionAgainstArmor = (
    actionEffect:
        | DecidedActionSquaddieEffect
        | DecidedActionMovementEffect
        | DecidedActionEndTurnEffect
): boolean =>
    actionEffect.type === ActionEffectType.SQUADDIE &&
    TraitStatusStorageService.getStatus(
        actionEffect.template.traits,
        Trait.TARGET_ARMOR
    ) === true

const isAnAttack = (actionEffect: DecidedActionSquaddieEffect): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffect.template.traits,
        Trait.ATTACK
    )
