import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { RollResult, RollResultService } from "./rollResult"
import {
    DegreeOfSuccess,
    DegreeOfSuccessAndSuccessBonus,
    TDegreeOfSuccess,
} from "./degreeOfSuccess"
import { CalculatedEffect, DegreeOfSuccessExplanation } from "./calculator"
import { Healing, SquaddieService } from "../../../squaddie/squaddieService"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { AttributeModifier } from "../../../squaddie/attribute/attributeModifier"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { DamageExplanationService } from "../../history/battleAction/battleActionSquaddieChange"
import {
    BattleActionActorContext,
    BattleActionActorContextService,
} from "../../history/battleAction/battleActionActorContext"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attribute"

export const CalculatorMiscellaneous = {
    getActorContext: (): BattleActionActorContext => {
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
    }): DegreeOfSuccessAndSuccessBonus =>
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
        degreeOfSuccess: TDegreeOfSuccess
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
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    return InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetBattleSquaddie.inBattleAttributes
    )
}

const getDegreeOfSuccess = ({}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
    targetSquaddieTemplate: SquaddieTemplate
}): DegreeOfSuccessAndSuccessBonus => ({
    successBonus: undefined,
    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
})

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    actorContext: BattleActionActorContext
    degreeOfSuccess: TDegreeOfSuccess
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
                healingType: Healing.LOST_HIT_POINTS,
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

const getAllPossibleDegreesOfSuccess = ({}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    targetSquaddieTemplate: SquaddieTemplate
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
}): DegreeOfSuccessExplanation => ({
    [DegreeOfSuccess.SUCCESS]: 36,
})
