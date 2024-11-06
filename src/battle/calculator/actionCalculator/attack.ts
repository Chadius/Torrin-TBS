import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { DIE_SIZE, RollResult, RollResultService } from "./rollResult"
import {
    AttributeModifier,
    AttributeType,
    AttributeTypeAndAmount,
    AttributeTypeAndAmountService,
} from "../../../squaddie/attributeModifier"
import { ActionEffectSquaddieTemplate } from "../../../action/template/actionEffectSquaddieTemplate"
import { BattleOrchestratorState } from "../../orchestrator/battleOrchestratorState"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { CalculateAgainstArmor } from "./calculateAgainstArmor"
import { CalculatedEffect } from "./calculator"
import { isValidValue } from "../../../utils/validityCheck"
import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { DamageType, SquaddieService } from "../../../squaddie/squaddieService"
import {
    DamageExplanation,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "../../history/battleAction/battleActionActionContext"
import { BattleActionsDuringTurnService } from "../../history/battleAction/battleActionsDuringTurn"
import { BattleActionService } from "../../history/battleAction/battleAction"

export const CalculatorAttack = {
    getDegreeOfSuccess: ({
        actionEffectSquaddieTemplate,
        actionContext,
        actingBattleSquaddie,
        targetedBattleSquaddie,
    }: {
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        targetedBattleSquaddie: BattleSquaddie
        actionContext: BattleActionActionContext
        actingBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            actingBattleSquaddie,
            targetedBattleSquaddie,
        }),
    getActingSquaddieModifiersForAttack: (
        gameEngineState: GameEngineState
    ): AttributeTypeAndAmount[] =>
        getActingSquaddieModifiersForAttack(gameEngineState),
    calculateEffectBasedOnDegreeOfSuccess: ({
        actionEffectSquaddieTemplate,
        actionContext,
        degreeOfSuccess,
        targetedSquaddieTemplate,
        targetedBattleSquaddie,
    }: {
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        actionContext: BattleActionActionContext
        degreeOfSuccess: DegreeOfSuccess
        targetedSquaddieTemplate: SquaddieTemplate
        targetedBattleSquaddie: BattleSquaddie
    }): CalculatedEffect =>
        calculateEffectBasedOnDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            degreeOfSuccess,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
        }),
    getTargetSquaddieModifiers: ({
        actionEffectSquaddieTemplate,
        targetedBattleSquaddie,
    }: {
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        targetedBattleSquaddie: BattleSquaddie
    }): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifiers({
            actionEffectSquaddieTemplate,
            targetedBattleSquaddie,
        }),
    getActorContext: ({
        actionEffectSquaddieTemplate,
        gameEngineState,
    }: {
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        gameEngineState: GameEngineState
    }): BattleActionActionContext => {
        let actingSquaddieModifiers =
            CalculatorAttack.getActingSquaddieModifiersForAttack(
                gameEngineState
            )
        let actingSquaddieRoll: RollResult
        actingSquaddieRoll = maybeMakeAttackRoll(
            actionEffectSquaddieTemplate,
            gameEngineState.battleOrchestratorState
        )

        return BattleActionActionContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers: {},
        })
    },
    calculateMultipleAttackPenaltyForActionsThisTurn: (
        gameEngineState: GameEngineState
    ): number =>
        calculateMultipleAttackPenaltyForActionsThisTurn(gameEngineState),
}

const calculateMultipleAttackPenaltyForActionsThisTurn = (
    gameEngineState: GameEngineState
) => {
    return BattleActionsDuringTurnService.getAll(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
            .actionsAlreadyAnimatedThisTurn
    ).reduce((mapTotal, battleAction) => {
        return (
            mapTotal +
            BattleActionService.multipleAttackPenaltyMultiplier(
                battleAction,
                gameEngineState.repository
            )
        )
    }, 0)
}

const getActingSquaddieModifiersForAttack = (
    gameEngineState: GameEngineState
): AttributeTypeAndAmount[] => {
    let multipleAttackPenalty =
        calculateMultipleAttackPenaltyForActionsThisTurn(gameEngineState)

    return [
        AttributeTypeAndAmountService.new({
            type: AttributeType.MULTIPLE_ATTACK_PENALTY,
            amount: multipleAttackPenalty,
        }),
    ].filter((attribute) => attribute.amount !== 0)
}

const conformToSixSidedDieRoll = (numberGeneratorResult: number): number => {
    const inRangeNumber = numberGeneratorResult % DIE_SIZE
    return inRangeNumber === 0 ? DIE_SIZE : inRangeNumber
}

const maybeMakeAttackRoll = (
    squaddieAction: ActionEffectSquaddieTemplate,
    battleOrchestratorState: BattleOrchestratorState
): RollResult => {
    if (doesActionNeedAnAttackRoll(squaddieAction)) {
        const attackRoll = [
            conformToSixSidedDieRoll(
                battleOrchestratorState.numberGenerator.next()
            ),
            conformToSixSidedDieRoll(
                battleOrchestratorState.numberGenerator.next()
            ),
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

const doesActionNeedAnAttackRoll = (
    action: ActionEffectSquaddieTemplate
): boolean =>
    TraitStatusStorageService.getStatus(
        action.traits,
        Trait.ALWAYS_SUCCEEDS
    ) !== true

const isActionAgainstArmor = (
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.VERSUS_ARMOR
    ) === true

const getTargetSquaddieModifiers = ({
    actionEffectSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isActionAgainstArmor(actionEffectSquaddieTemplate)) {
        return CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            targetedBattleSquaddie
        )
    }

    return []
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

const getDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    targetedBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
}): DegreeOfSuccess => {
    let actingSquaddieModifierTotal: number =
        actionContext.actingSquaddieModifiers.reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    let targetSquaddieModifierTotal: number =
        actionContext.targetSquaddieModifiers[
            targetedBattleSquaddie.battleSquaddieId
        ].reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    return compareAttackRollToGetDegreeOfSuccess({
        actionEffectSquaddieTemplate,
        actor: actingBattleSquaddie,
        target: targetedBattleSquaddie,
        actingSquaddieRoll: actionContext.actingSquaddieRoll,
        actingSquaddieModifierTotal:
            actingSquaddieModifierTotal - targetSquaddieModifierTotal,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    actionContext,
    degreeOfSuccess,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    let damageExplanation: DamageExplanation = DamageExplanationService.new({})

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
            const damageExplanationForThisEffect =
                SquaddieService.calculateDealtDamageToTheSquaddie({
                    squaddieTemplate: targetedSquaddieTemplate,
                    battleSquaddie: targetedBattleSquaddie,
                    damage: rawDamageFromAction,
                    damageType,
                })
            damageExplanation.net += damageExplanationForThisEffect.net
            damageExplanation.raw += damageExplanationForThisEffect.raw
            damageExplanation.absorbed +=
                damageExplanationForThisEffect.absorbed
        }
    )

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffectSquaddieTemplate,
        })

    return {
        attributeModifiersToAddToTarget,
        damage: damageExplanation,
        degreeOfSuccess,
        healingReceived: 0,
    }
}

const calculateAttributeModifiers = ({
    actionEffectSquaddieTemplate,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
}): AttributeModifier[] => {
    if (!isValidValue(actionEffectSquaddieTemplate.attributeModifiers)) {
        return []
    }

    return [...actionEffectSquaddieTemplate.attributeModifiers]
}
