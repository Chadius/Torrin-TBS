import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { RollResult, RollResultService } from "./rollResult"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { BattleAction } from "../../history/battleAction/battleAction"
import { CalculatedEffect } from "./calculator"
import { HealingType, SquaddieService } from "../../../squaddie/squaddieService"
import { isValidValue } from "../../../utils/validityCheck"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { DamageExplanationService } from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "../../history/battleAction/battleActionActionContext"

export const CalculatorMiscellaneous = {
    getActorContext: ({
        actionEffectTemplate,
        gameEngineState,
        battleAction,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        gameEngineState: GameEngineState
        battleAction?: BattleAction
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
    getDegreeOfSuccess: ({
        actionEffectSquaddieTemplate,
        actionContext,
        actingBattleSquaddie,
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectSquaddieTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        actionContext: BattleActionActionContext
        actingBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            actingBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
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
}

const getTargetSquaddieModifiers = ({
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    return InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetBattleSquaddie.inBattleAttributes
    )
}

const getDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
    targetSquaddieTemplate,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
    targetSquaddieTemplate: SquaddieTemplate
}): DegreeOfSuccess => DegreeOfSuccess.SUCCESS

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
    let healingReceived = calculateTotalHealingReceived({
        targetBattleSquaddie,
        actionEffectSquaddieTemplate,
    })

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffectSquaddieTemplate,
        })

    return {
        attributeModifiersToAddToTarget,
        damage: DamageExplanationService.new({}),
        degreeOfSuccess,
        healingReceived,
    }
}

const calculateTotalHealingReceived = ({
    targetBattleSquaddie,
    actionEffectSquaddieTemplate,
}: {
    targetBattleSquaddie: BattleSquaddie
    actionEffectSquaddieTemplate: ActionEffectTemplate
}) => {
    if (!isValidValue(actionEffectSquaddieTemplate)) {
        return 0
    }

    let healingReceived = 0

    if (actionEffectSquaddieTemplate.healingDescriptions.LOST_HIT_POINTS) {
        ;({ healingReceived } =
            SquaddieService.calculateGiveHealingToTheSquaddie({
                battleSquaddie: targetBattleSquaddie,
                healingAmount:
                    actionEffectSquaddieTemplate.healingDescriptions
                        .LOST_HIT_POINTS,
                healingType: HealingType.LOST_HIT_POINTS,
            }))
    }
    return healingReceived
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
