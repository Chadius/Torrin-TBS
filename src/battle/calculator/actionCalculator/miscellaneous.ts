import { ActionsThisRound } from "../../history/actionsThisRound"
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
import { isValidValue } from "../../../utils/validityCheck"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { ActionEffectSquaddieTemplate } from "../../../action/template/actionEffectSquaddieTemplate"
import { DamageExplanationService } from "../../history/battleActionSquaddieChange"

export const CalculatorMiscellaneous = {
    getActorContext: ({
        actionEffectSquaddieTemplate,
        gameEngineState,
        actionsThisRound,
    }: {
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
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
}

const getTargetSquaddieModifiers = ({
    actionEffectSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    return InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetedBattleSquaddie.inBattleAttributes
    )
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
}): DegreeOfSuccess => DegreeOfSuccess.SUCCESS

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
    let healingReceived = calculateTotalHealingReceived({
        targetedBattleSquaddie,
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
    targetedBattleSquaddie,
    actionEffectSquaddieTemplate,
}: {
    targetedBattleSquaddie: BattleSquaddie
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
}) => {
    if (!isValidValue(actionEffectSquaddieTemplate)) {
        return 0
    }

    let healingReceived = 0

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
    actionEffectSquaddieTemplate,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
}): AttributeModifier[] => {
    if (!isValidValue(actionEffectSquaddieTemplate.attributeModifiers)) {
        return []
    }

    return [...actionEffectSquaddieTemplate.attributeModifiers]
}
