import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import {
    DIE_SIZE,
    RollModifierType,
    RollResult,
    RollResultService,
} from "./rollResult"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
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
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectSquaddieTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
        actionContext: BattleActionActionContext
        actingBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            actingBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
    getActingSquaddieModifiersForAttack: (
        gameEngineState: GameEngineState
    ): AttributeTypeAndAmount[] =>
        getActingSquaddieModifiersForAttack(gameEngineState),
    calculateEffectBasedOnDegreeOfSuccess: ({
        actionEffectSquaddieTemplate,
        actionContext,
        degreeOfSuccess,
        targetSquaddieTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectSquaddieTemplate: ActionEffectTemplate
        actionContext: BattleActionActionContext
        degreeOfSuccess: DegreeOfSuccess
        targetSquaddieTemplate: SquaddieTemplate
        targetBattleSquaddie: BattleSquaddie
    }): CalculatedEffect =>
        calculateEffectBasedOnDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            degreeOfSuccess,
            targetSquaddieTemplate,
            targetBattleSquaddie,
        }),
    getTargetSquaddieModifiers: ({
        actionEffectSquaddieTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectSquaddieTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
    }): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifiers({
            actionEffectSquaddieTemplate,
            targetBattleSquaddie,
        }),
    getActorContext: ({
        actionEffectTemplate,
        gameEngineState,
        actorBattleSquaddie,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        gameEngineState: GameEngineState
        actorBattleSquaddie: BattleSquaddie
    }): BattleActionActionContext => {
        let actingSquaddieModifiers =
            CalculatorAttack.getActingSquaddieModifiersForAttack(
                gameEngineState
            )
        let actingSquaddieRoll: RollResult
        actingSquaddieRoll = maybeMakeAttackRoll({
            actionEffectTemplate,
            gameEngineState,
            actorBattleSquaddie,
        })

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
    return [].filter((attribute) => attribute.amount !== 0)
}

const conformToSixSidedDieRoll = (numberGeneratorResult: number): number => {
    const inRangeNumber = numberGeneratorResult % DIE_SIZE
    return inRangeNumber === 0 ? DIE_SIZE : inRangeNumber
}

const maybeMakeAttackRoll = ({
    actionEffectTemplate,
    gameEngineState,
    actorBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    gameEngineState: GameEngineState
    actorBattleSquaddie: BattleSquaddie
}): RollResult => {
    if (doesActionNeedAnAttackRoll(actionEffectTemplate)) {
        const rollModifiers = {
            [RollModifierType.MULTIPLE_ATTACK_PENALTY]:
                calculateMultipleAttackPenaltyForActionsThisTurn(
                    gameEngineState
                ),
            [RollModifierType.TIER]:
                actorBattleSquaddie.inBattleAttributes.armyAttributes.tier,
        }

        const attackRoll = [
            conformToSixSidedDieRoll(
                gameEngineState.battleOrchestratorState.numberGenerator.next()
            ),
            conformToSixSidedDieRoll(
                gameEngineState.battleOrchestratorState.numberGenerator.next()
            ),
        ]
        return RollResultService.new({
            occurred: true,
            rolls: [...attackRoll],
            rollModifiers,
        })
    }
    return RollResultService.new({
        occurred: false,
        rolls: [],
    })
}

const doesActionNeedAnAttackRoll = (action: ActionEffectTemplate): boolean =>
    TraitStatusStorageService.getStatus(
        action.traits,
        Trait.ALWAYS_SUCCEEDS
    ) !== true

const isActionAgainstArmor = (
    actionEffectSquaddieTemplate: ActionEffectTemplate
): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.VERSUS_ARMOR
    ) === true

const getTargetSquaddieModifiers = ({
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isActionAgainstArmor(actionEffectSquaddieTemplate)) {
        return CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            targetBattleSquaddie
        )
    }

    return []
}

const adjustDegreeOfSuccessBasedOnExtremeRoll = (
    actingSquaddieRoll: RollResult,
    degreeOfSuccess: DegreeOfSuccess
) => {
    if (RollResultService.isMaximumRoll(actingSquaddieRoll)) {
        degreeOfSuccess =
            DegreeOfSuccessService.upgradeByOneStep(degreeOfSuccess)
    }
    if (RollResultService.isMinimumRoll(actingSquaddieRoll)) {
        degreeOfSuccess =
            DegreeOfSuccessService.degradeByOneStep(degreeOfSuccess)
    }
    return degreeOfSuccess
}

const calculateDegreeOfSuccessBasedOnRollTotalVersusTarget = (
    totalAttackRoll: any,
    targetArmorClass: number
): DegreeOfSuccess => {
    let degreeOfSuccess: DegreeOfSuccess = DegreeOfSuccess.FAILURE
    switch (true) {
        case totalAttackRoll >= targetArmorClass + DIE_SIZE:
            degreeOfSuccess = DegreeOfSuccess.CRITICAL_SUCCESS
            break
        case totalAttackRoll >= targetArmorClass:
            degreeOfSuccess = DegreeOfSuccess.SUCCESS
            break
        case totalAttackRoll <= targetArmorClass - DIE_SIZE:
            degreeOfSuccess = DegreeOfSuccess.CRITICAL_FAILURE
            break
    }
    return degreeOfSuccess
}
const compareAttackRollToGetDegreeOfSuccess = ({
    actor,
    actingSquaddieRoll,
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actingSquaddieModifierTotal,
}: {
    actor: BattleSquaddie
    actingSquaddieRoll: RollResult
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
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

    let totalAttackRoll =
        RollResultService.totalAttackRoll(actingSquaddieRoll) +
        actingSquaddieModifierTotal
    let targetArmorClass = SquaddieService.getArmorClass({
        battleSquaddie: targetBattleSquaddie,
        squaddieTemplate: targetSquaddieTemplate,
    }).net
    let degreeOfSuccess = calculateDegreeOfSuccessBasedOnRollTotalVersusTarget(
        totalAttackRoll,
        targetArmorClass
    )
    degreeOfSuccess = adjustDegreeOfSuccessBasedOnExtremeRoll(
        actingSquaddieRoll,
        degreeOfSuccess
    )
    degreeOfSuccess = capCriticalSuccessIfResultCannotCriticallySucceed(
        actionEffectSquaddieTemplate,
        degreeOfSuccess
    )
    degreeOfSuccess = capCriticalFailureIfResultCannotCriticallyFail(
        actionEffectSquaddieTemplate,
        degreeOfSuccess
    )
    return degreeOfSuccess
}

const capCriticalSuccessIfResultCannotCriticallySucceed = (
    actionEffectSquaddieTemplate: ActionEffectTemplate,
    degreeOfSuccess: DegreeOfSuccess
) => {
    const canCriticallySucceed: boolean = !TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.CANNOT_CRITICALLY_SUCCEED
    )
    if (
        !canCriticallySucceed &&
        degreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS
    ) {
        degreeOfSuccess = DegreeOfSuccess.SUCCESS
    }
    return degreeOfSuccess
}

const capCriticalFailureIfResultCannotCriticallyFail = (
    actionEffectSquaddieTemplate: ActionEffectTemplate,
    degreeOfSuccess: DegreeOfSuccess
) => {
    const canCriticallyFail: boolean = !TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
        Trait.CANNOT_CRITICALLY_FAIL
    )
    if (
        !canCriticallyFail &&
        degreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE
    ) {
        degreeOfSuccess = DegreeOfSuccess.FAILURE
    }
    return degreeOfSuccess
}

const getDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actionContext,
    actingBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
}): DegreeOfSuccess => {
    let actingSquaddieModifierTotal: number =
        actionContext.actorAttributeModifiers.reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    let targetSquaddieModifierTotal: number =
        actionContext.targetAttributeModifiers[
            targetBattleSquaddie.battleSquaddieId
        ].reduce(
            (previousValue: number, currentValue: AttributeTypeAndAmount) => {
                return previousValue + currentValue.amount
            },
            0
        )

    return compareAttackRollToGetDegreeOfSuccess({
        actionEffectSquaddieTemplate,
        actor: actingBattleSquaddie,
        targetBattleSquaddie: targetBattleSquaddie,
        targetSquaddieTemplate: targetSquaddieTemplate,
        actingSquaddieRoll: actionContext.actorRoll,
        actingSquaddieModifierTotal:
            actingSquaddieModifierTotal - targetSquaddieModifierTotal,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    actionContext,
    degreeOfSuccess,
    targetSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetSquaddieTemplate: SquaddieTemplate
    targetBattleSquaddie: BattleSquaddie
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
                    squaddieTemplate: targetSquaddieTemplate,
                    battleSquaddie: targetBattleSquaddie,
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
    actionEffectSquaddieTemplate: ActionEffectTemplate
}): AttributeModifier[] => {
    if (!isValidValue(actionEffectSquaddieTemplate.attributeModifiers)) {
        return []
    }

    return [...actionEffectSquaddieTemplate.attributeModifiers]
}
