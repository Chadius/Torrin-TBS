import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ACTOR_MODIFIER } from "../modifierConstants"
import { DecidedActionSquaddieEffect } from "../../action/decided/decidedActionSquaddieEffect"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleSquaddie } from "../battleSquaddie"
import { DIE_SIZE, RollResult, RollResultService } from "./rollResult"
import {
    AttributeModifier,
    AttributeType,
} from "../../squaddie/attributeModifier"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "../history/battleAction"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { DecidedActionMovementEffect } from "../../action/decided/decidedActionMovementEffect"
import { DecidedActionEndTurnEffect } from "../../action/decided/decidedActionEndTurnEffect"
import { CalculateAgainstArmor } from "./calculateAgainstArmor"
import { CalculatedEffect } from "./calculator"
import { DecidedActionEffect } from "../../action/decided/decidedActionEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { isValidValue } from "../../utils/validityCheck"
import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { DamageType, SquaddieService } from "../../squaddie/squaddieService"

export const CalculatorAttack = {
    getDegreeOfSuccess: ({
        actionEffect,
        actionContext,
        actingBattleSquaddie,
        targetedBattleSquaddie,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        targetedBattleSquaddie: BattleSquaddie
        actionContext: BattleActionActionContext
        actingBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffect,
            actionContext,
            actingBattleSquaddie,
            targetedBattleSquaddie,
        }),
    getActingSquaddieModifiersForAttack: (
        actionsThisRound: ActionsThisRound
    ): {
        actingSquaddieModifierTotal: number
        actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number }
    } => getActingSquaddieModifiersForAttack(actionsThisRound),
    calculateEffectBasedOnDegreeOfSuccess: ({
        actionEffect,
        actionContext,
        degreeOfSuccess,
        targetedSquaddieTemplate,
        targetedBattleSquaddie,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        actionContext: BattleActionActionContext
        degreeOfSuccess: DegreeOfSuccess
        targetedSquaddieTemplate: SquaddieTemplate
        targetedBattleSquaddie: BattleSquaddie
    }): CalculatedEffect =>
        calculateEffectBasedOnDegreeOfSuccess({
            actionEffect,
            actionContext,
            degreeOfSuccess,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
        }),
    getTargetSquaddieModifiers: ({
        actionEffect,
        targetedBattleSquaddie,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        targetedBattleSquaddie: BattleSquaddie
    }): {
        modifierTotal: number
        modifiers: { [modifier in AttributeType]?: number }
    } => getTargetSquaddieModifiers({ actionEffect, targetedBattleSquaddie }),
    getActorContext: ({
        actionEffect,
        gameEngineState,
        actionsThisRound,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        gameEngineState: GameEngineState
        actionsThisRound: ActionsThisRound
    }): BattleActionActionContext => {
        let { actingSquaddieModifiers, actingSquaddieModifierTotal } =
            CalculatorAttack.getActingSquaddieModifiersForAttack(
                actionsThisRound
            )
        let actingSquaddieRoll: RollResult
        actingSquaddieRoll = maybeMakeAttackRoll(
            actionEffect.template,
            gameEngineState.battleOrchestratorState
        )

        return BattleActionActionContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers: {},
        })
    },
}

const getActingSquaddieModifiersForAttack: (
    actionsThisRound: ActionsThisRound
) => {
    actingSquaddieModifierTotal: number
    actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number }
} = (actionsThisRound: ActionsThisRound) => {
    let { multipleAttackPenalty } =
        ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(
            actionsThisRound
        )
    let actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number } = {}

    if (multipleAttackPenalty !== 0) {
        actingSquaddieModifiers[ACTOR_MODIFIER.MULTIPLE_ATTACK_PENALTY] =
            multipleAttackPenalty
    }

    let actingSquaddieModifierTotal: number = Object.values(
        actingSquaddieModifiers
    ).reduce((previousValue: number, currentValue: number) => {
        return previousValue + currentValue
    }, 0)

    return {
        actingSquaddieModifiers,
        actingSquaddieModifierTotal,
    }
}

const conformToSixSidedDieRoll = (numberGeneratorResult: number): number => {
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

const doesActionNeedAnAttackRoll = (
    action: ActionEffectSquaddieTemplate
): boolean =>
    TraitStatusStorageService.getStatus(
        action.traits,
        Trait.ALWAYS_SUCCEEDS
    ) !== true

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

const getTargetSquaddieModifiers = ({
    actionEffect,
    targetedBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    targetedBattleSquaddie: BattleSquaddie
}): {
    modifierTotal: number
    modifiers: { [modifier in AttributeType]?: number }
} => {
    if (isActionAgainstArmor(actionEffect)) {
        return CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            targetedBattleSquaddie
        )
    }

    return {
        modifierTotal: 0,
        modifiers: {},
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

const getDegreeOfSuccess = ({
    actionEffect,
    targetedBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
}): DegreeOfSuccess => {
    let actingSquaddieModifierTotal: number = Object.values(
        actionContext.actingSquaddieModifiers
    ).reduce((previousValue: number, currentValue: number) => {
        return previousValue + currentValue
    }, 0)

    let targetSquaddieModifierTotal: number = Object.values(
        actionContext.targetSquaddieModifiers[
            targetedBattleSquaddie.battleSquaddieId
        ]
    ).reduce((previousValue: number, currentValue: number) => {
        return previousValue + currentValue
    }, 0)

    return compareAttackRollToGetDegreeOfSuccess({
        actionEffectSquaddieTemplate: actionEffect.template,
        actor: actingBattleSquaddie,
        target: targetedBattleSquaddie,
        actingSquaddieRoll: actionContext.actingSquaddieRoll,
        actingSquaddieModifierTotal:
            actingSquaddieModifierTotal - targetSquaddieModifierTotal,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffect,
    actionContext,
    degreeOfSuccess,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    let damageDealt = 0
    const actionEffectSquaddieTemplate = actionEffect.template

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

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffect,
        })

    return {
        attributeModifiersToAddToTarget,
        damageDealt,
        degreeOfSuccess,
        healingReceived: 0,
    }
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
