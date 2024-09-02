import { ActionsThisRound } from "../../history/actionsThisRound"
import { DecidedActionSquaddieEffect } from "../../../action/decided/decidedActionSquaddieEffect"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { RollResult, RollResultService } from "./rollResult"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "../../history/battleAction"
import { CalculatedEffect } from "./calculator"
import { HealingType, SquaddieService } from "../../../squaddie/squaddieService"
import { DecidedActionEffect } from "../../../action/decided/decidedActionEffect"
import { isValidValue } from "../../../utils/validityCheck"
import { ActionEffectType } from "../../../action/template/actionEffectTemplate"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"

export const CalculatorMiscellaneous = {
    getActorContext: ({
        actionEffect,
        gameEngineState,
        actionsThisRound,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        gameEngineState: GameEngineState
        actionsThisRound: ActionsThisRound
    }): BattleActionActionContext => {
        let actingSquaddieRoll: RollResult = RollResultService.new({
            occurred: false,
            rolls: [],
        })

        return BattleActionActionContextService.new({
            actingSquaddieModifiers: [],
            actingSquaddieRoll,
            targetSquaddieModifiers: {},
        })
    },
    getTargetSquaddieModifiers: ({
        actionEffect,
        targetedBattleSquaddie,
    }: {
        actionEffect: DecidedActionSquaddieEffect
        targetedBattleSquaddie: BattleSquaddie
    }): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifiers({ actionEffect, targetedBattleSquaddie }),
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
}

const getTargetSquaddieModifiers = ({
    actionEffect,
    targetedBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    targetedBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    return InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetedBattleSquaddie.inBattleAttributes
    )
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
}): DegreeOfSuccess => DegreeOfSuccess.SUCCESS

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
    let healingReceived = calculateTotalHealingReceived({
        targetedBattleSquaddie,
        actionEffect: actionEffect,
    })

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffect,
        })

    return {
        attributeModifiersToAddToTarget,
        damageDealt: 0,
        degreeOfSuccess,
        healingReceived,
    }
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
