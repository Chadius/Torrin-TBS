import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { RollResult, RollResultService } from "./rollResult"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { BattleAction } from "../../history/battleAction/battleAction"
import { CalculatedEffect, DegreeOfSuccessExplanation } from "./calculator"
import { HealingType, SquaddieService } from "../../../squaddie/squaddieService"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { AttributeModifier } from "../../../squaddie/attribute/attributeModifier"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { DamageExplanationService } from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleActionActorContext,
    BattleActionActorContextService,
} from "../../history/battleAction/battleActionActorContext"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attributeType"

export const CalculatorMiscellaneous = {
    getActorContext: ({
        actionEffectTemplate,
        gameEngineState,
        battleAction,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        gameEngineState: GameEngineState
        battleAction?: BattleAction
    }): BattleActionActorContext => {
        let actingSquaddieRoll: RollResult = RollResultService.new({
            occurred: false,
            rolls: [],
        })

        return BattleActionActorContextService.new({
            actingSquaddieModifiers: [],
            actingSquaddieRoll,
            targetSquaddieModifiers: {},
        })
    },
    getTargetSquaddieModifiers: ({
        actionEffectTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
    }): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifiers({
            actionEffectTemplate,
            targetBattleSquaddie,
        }),
    getDegreeOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        actorBattleSquaddie,
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        actorContext: BattleActionActorContext
        actorBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
    }): DegreeOfSuccess =>
        getDegreeOfSuccess({
            actionEffectTemplate,
            actorContext,
            actorBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
    calculateEffectBasedOnDegreeOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        degreeOfSuccess,
        targetSquaddieTemplate,
        targetBattleSquaddie,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        actorContext: BattleActionActorContext
        degreeOfSuccess: DegreeOfSuccess
        targetSquaddieTemplate: SquaddieTemplate
        targetBattleSquaddie: BattleSquaddie
    }): CalculatedEffect =>
        calculateEffectBasedOnDegreeOfSuccess({
            actionEffectTemplate,
            actorContext,
            degreeOfSuccess,
            targetSquaddieTemplate,
            targetBattleSquaddie,
        }),
    getAllPossibleDegreesOfSuccess: ({
        actionEffectTemplate,
        actorContext,
        actorBattleSquaddie,
        targetBattleSquaddie,
        targetSquaddieTemplate,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        targetBattleSquaddie: BattleSquaddie
        targetSquaddieTemplate: SquaddieTemplate
        actorContext: BattleActionActorContext
        actorBattleSquaddie: BattleSquaddie
    }): DegreeOfSuccessExplanation =>
        getAllPossibleDegreesOfSuccess({
            actionEffectTemplate,
            actorContext,
            actorBattleSquaddie,
            targetBattleSquaddie,
            targetSquaddieTemplate,
        }),
}

const getTargetSquaddieModifiers = ({
    actionEffectTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    return InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetBattleSquaddie.inBattleAttributes
    )
}

const getDegreeOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
    actorContext,
    actorBattleSquaddie,
    targetSquaddieTemplate,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
    targetSquaddieTemplate: SquaddieTemplate
}): DegreeOfSuccess => DegreeOfSuccess.SUCCESS

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectTemplate,
    actorContext,
    degreeOfSuccess,
    targetSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    actorContext: BattleActionActorContext
    degreeOfSuccess: DegreeOfSuccess
    targetSquaddieTemplate: SquaddieTemplate
    targetBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    let healingReceived = calculateTotalHealingReceived({
        targetBattleSquaddie,
        actionEffectTemplate,
    })

    let attributeModifiersToAddToTarget: AttributeModifier[] =
        calculateAttributeModifiers({
            actionEffectTemplate,
        })

    return {
        degreeOfSuccess: undefined,
        attributeModifiersToAddToTarget,
        damage: DamageExplanationService.new({}),
        healingReceived,
    }
}

const calculateTotalHealingReceived = ({
    targetBattleSquaddie,
    actionEffectTemplate,
}: {
    targetBattleSquaddie: BattleSquaddie
    actionEffectTemplate: ActionEffectTemplate
}) => {
    if (!isValidValue(actionEffectTemplate)) {
        return 0
    }

    let healingReceived = 0

    if (actionEffectTemplate.healingDescriptions.LOST_HIT_POINTS) {
        ;({ healingReceived } =
            SquaddieService.calculateGiveHealingToTheSquaddie({
                battleSquaddie: targetBattleSquaddie,
                healingAmount:
                    actionEffectTemplate.healingDescriptions.LOST_HIT_POINTS,
                healingType: HealingType.LOST_HIT_POINTS,
            }))
    }
    return healingReceived
}

const calculateAttributeModifiers = ({
    actionEffectTemplate,
}: {
    actionEffectTemplate: ActionEffectTemplate
}): AttributeModifier[] => {
    if (!isValidValue(actionEffectTemplate.attributeModifiers)) {
        return []
    }

    return [...actionEffectTemplate.attributeModifiers]
}

const getAllPossibleDegreesOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
    targetSquaddieTemplate,
    actorContext,
    actorBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
}): DegreeOfSuccessExplanation => ({
    [DegreeOfSuccess.SUCCESS]: 36,
})
