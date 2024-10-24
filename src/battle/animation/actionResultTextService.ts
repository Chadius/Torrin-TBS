import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ActionResultText } from "./actionAnimation/actionResultText"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { RollResultService } from "../calculator/actionCalculator/rollResult"
import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { BattleActionSquaddieChange } from "../history/battleAction/battleActionSquaddieChange"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    AttributeSource,
    AttributeType,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"
import { BattleActionActionContext } from "../history/battleAction/battleActionActionContext"

export const ActionResultTextService = {
    outputResultForTextOnly: ({
        currentActionEffectSquaddieTemplate,
        squaddieRepository,
        actionTemplateName,
        battleActionSquaddieChanges,
        actingBattleSquaddieId,
        actingContext,
    }: {
        currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        battleActionSquaddieChanges: BattleActionSquaddieChange[]
        actingContext: BattleActionActionContext
        squaddieRepository: ObjectRepository
        actionTemplateName: string
        actingBattleSquaddieId: string
    }): string[] => {
        return outputResultForTextOnly({
            actionTemplateName,
            currentActionEffectSquaddieTemplate,
            battleActionSquaddieChanges,
            squaddieRepository,
            actingContext,
            actingBattleSquaddieId,
        })
    },
    outputIntentForTextOnly: ({
        actionTemplate,
        currentActionEffectSquaddieTemplate,
        actingBattleSquaddieId,
        squaddieRepository,
        actingSquaddieModifiers,
    }: {
        actionTemplate: ActionTemplate
        currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        actingBattleSquaddieId: string
        squaddieRepository: ObjectRepository
        actingSquaddieModifiers: AttributeTypeAndAmount[]
    }): string[] => {
        return outputIntentForTextOnly({
            actionTemplate,
            currentActionEffectSquaddieTemplate,
            actingBattleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers,
        })
    },
    getSquaddieUsesActionString: ({
        squaddieTemplate,
        actionTemplateName,
        newline,
    }: {
        squaddieTemplate: SquaddieTemplate
        actionTemplateName: string
        newline: boolean
    }): string => {
        return `${squaddieTemplate.squaddieId.name} uses${newline ? "\n" : " "}${actionTemplateName}`
    },
    getRollsDescriptionString: ({
        rolls,
        addSpacing,
    }: {
        rolls: number[]
        addSpacing: boolean
    }): string => {
        return `${addSpacing ? "   " : ""}rolls (${rolls[0]}, ${rolls[1]})`
    },
    getHinderingActionMissedString: ({
        squaddieTemplate,
    }: {
        squaddieTemplate: SquaddieTemplate
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: MISS!`
    },
    getHinderingActionCriticallyMissedString: ({
        squaddieTemplate,
    }: {
        squaddieTemplate: SquaddieTemplate
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: CRITICAL MISS!!`
    },
    getHinderingActionDealtNoDamageString: ({
        squaddieTemplate,
    }: {
        squaddieTemplate: SquaddieTemplate
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: NO DAMAGE`
    },
    getHinderingActionDealtDamageString: ({
        squaddieTemplate,
        damageTaken,
    }: {
        squaddieTemplate: SquaddieTemplate
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name} takes ${damageTaken} damage`
    },
    getHinderingActionDealtCriticalDamageString: ({
        squaddieTemplate,
        damageTaken,
    }: {
        squaddieTemplate: SquaddieTemplate
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: CRITICAL HIT! ${damageTaken} damage`
    },
    getHelpfulActionHealingReceivedString({
        squaddieTemplate,
        healingReceived,
    }: {
        squaddieTemplate: SquaddieTemplate
        healingReceived: number
    }): string {
        return `${squaddieTemplate.squaddieId.name} receives ${healingReceived} healing`
    },
    calculateActorUsesActionDescriptionText: ({
        timer,
        actorTemplate,
        actionTemplateName,
        results,
    }: {
        timer?: ActionTimer
        actorTemplate: SquaddieTemplate
        actionTemplateName: string
        results: SquaddieSquaddieResults
    }): string => {
        let actorUsesActionDescriptionText =
            ActionResultTextService.getSquaddieUsesActionString({
                squaddieTemplate: actorTemplate,
                actionTemplateName: actionTemplateName,
                newline: true,
            })
        if (!timer) {
            return actorUsesActionDescriptionText
        }
        if (
            [
                ActionAnimationPhase.DURING_ACTION,
                ActionAnimationPhase.TARGET_REACTS,
                ActionAnimationPhase.SHOWING_RESULTS,
                ActionAnimationPhase.FINISHED_SHOWING_RESULTS,
            ].includes(timer.currentPhase) &&
            results.actingContext.actingSquaddieRoll.occurred
        ) {
            actorUsesActionDescriptionText += `\n\n`
            actorUsesActionDescriptionText += `   rolls(${results.actingContext.actingSquaddieRoll.rolls[0]}, ${results.actingContext.actingSquaddieRoll.rolls[1]})`

            const attackPenaltyDescriptions =
                ActionResultText.getAttackPenaltyDescriptions(
                    results.actingContext.actingSquaddieModifiers
                )
            if (attackPenaltyDescriptions.length > 0) {
                actorUsesActionDescriptionText +=
                    "\n" + attackPenaltyDescriptions.join("\n")
            }

            actorUsesActionDescriptionText += `\n${ActionResultText.getActingSquaddieRollTotalIfNeeded(results.actingContext)}`

            if (
                RollResultService.isACriticalSuccess(
                    results.actingContext.actingSquaddieRoll
                )
            ) {
                actorUsesActionDescriptionText += `\n\nCRITICAL HIT!`
            }
            if (
                RollResultService.isACriticalFailure(
                    results.actingContext.actingSquaddieRoll
                )
            ) {
                actorUsesActionDescriptionText += `\n\nCRITICAL MISS!!`
            }
        }
        return actorUsesActionDescriptionText
    },
    getBeforeActionText: ({
        targetTemplate,
        targetBattle,
        actionEffectSquaddieTemplate,
    }: {
        targetTemplate: SquaddieTemplate
        targetBattle: BattleSquaddie
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    }): string => {
        let targetBeforeActionText = `${targetTemplate.squaddieId.name}`

        const targetModifiers: {
            type: AttributeType
            amount: number
        }[] = InBattleAttributesService.calculateCurrentAttributeModifiers(
            targetBattle.inBattleAttributes
        )

        if (
            ActionEffectSquaddieTemplateService.doesItTargetFoes(
                actionEffectSquaddieTemplate
            )
        ) {
            const armorModifier =
                targetModifiers.find(
                    (modifier) => modifier.type === AttributeType.ARMOR
                )?.amount || 0
            targetBeforeActionText += `\nArmor ${targetBattle.inBattleAttributes.armyAttributes.armorClass + armorModifier}`

            if (armorModifier) {
                targetBeforeActionText += `\n ${armorModifier > 0 ? "+" : ""}${armorModifier} Armor`
            }
        }

        return targetBeforeActionText
    },
    getAfterActionText: ({
        result,
    }: {
        result: BattleActionSquaddieChange
    }): string => {
        let targetAfterActionText = ""
        let damageText = ""
        switch (result.actorDegreeOfSuccess) {
            case DegreeOfSuccess.FAILURE:
                targetAfterActionText = `MISS`
                break
            case DegreeOfSuccess.CRITICAL_SUCCESS:
                damageText = "CRITICAL HIT!\n"
                if (result.damage.net === 0 && result.healingReceived === 0) {
                    damageText += `NO DAMAGE`
                } else if (result.damage.net > 0) {
                    damageText += `${result.damage.net} damage`
                }
                targetAfterActionText = damageText
                if (result.damage.absorbed > 0) {
                    targetAfterActionText += `\n${result.damage.absorbed} Absorbed`
                }
                break
            case DegreeOfSuccess.CRITICAL_FAILURE:
                targetAfterActionText = `CRITICAL MISS!!`
                break
            case DegreeOfSuccess.SUCCESS:
                if (result.damage.net === 0 && result.healingReceived === 0) {
                    targetAfterActionText = `NO DAMAGE`
                } else if (result.damage.net > 0) {
                    targetAfterActionText = `${result.damage.net} damage`
                }
                if (result.damage.absorbed > 0) {
                    targetAfterActionText += `\n${result.damage.absorbed} Absorbed`
                }
                break
            default:
                break
        }

        if (result.healingReceived > 0) {
            targetAfterActionText += `${result.healingReceived} healed`
        }

        return targetAfterActionText
    },
}

const getAttributeModifierChanges = ({
    squaddieChange,
    targetSquaddieTemplate,
}: {
    squaddieChange: BattleActionSquaddieChange
    targetSquaddieTemplate: SquaddieTemplate
}): string[] => {
    if (!squaddieChange?.attributesAfter?.attributeModifiers) {
        return []
    }

    const attributeTypeToStringMapping: { [t in AttributeType]?: string } = {
        [AttributeType.ARMOR]: "Armor",
        [AttributeType.ABSORB]: "Absorb",
    }
    const attributeSourceToStringMapping: {
        [t in AttributeSource]?: string
    } = {
        [AttributeSource.CIRCUMSTANCE]: "Circumstance",
    }

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            squaddieChange.attributesBefore,
            squaddieChange.attributesAfter
        )

    const getAttributeAmountMessage = (
        attributeModifierDifference: AttributeTypeAndAmount
    ) => {
        let attributeAmountAsString: string
        switch (true) {
            case attributeModifierDifference.amount > 0:
                attributeAmountAsString = `+${attributeModifierDifference.amount}`
                break
            case attributeModifierDifference.amount < 0:
                attributeAmountAsString = `${attributeModifierDifference.amount}`
                break
            default:
                attributeAmountAsString = "NO CHANGE"
                break
        }
        return attributeAmountAsString
    }
    const getAttributeSourceMessage = (
        attributeModifierDifference: AttributeTypeAndAmount
    ) => {
        const afterAttribute =
            squaddieChange.attributesAfter.attributeModifiers.find(
                (attributeModifier) =>
                    attributeModifier.type === attributeModifierDifference.type
            )
        let attributeSourceAsString: string = ` (${attributeSourceToStringMapping[afterAttribute.source] || afterAttribute.source})`
        if (attributeModifierDifference.amount === 0) {
            attributeSourceAsString = ""
        }
        return attributeSourceAsString
    }
    return attributeModifierDifferences.map((attributeModifierDifference) => {
        const attributeTypeAsString: string =
            attributeTypeToStringMapping[attributeModifierDifference.type] ||
            attributeModifierDifference.type
        let attributeAmountAsString = getAttributeAmountMessage(
            attributeModifierDifference
        )
        let attributeSourceAsString = getAttributeSourceMessage(
            attributeModifierDifference
        )
        return `${targetSquaddieTemplate.squaddieId.name} ${attributeTypeAsString} ${attributeAmountAsString}${attributeSourceAsString}`
    })
}

const outputResultForTextOnly = ({
    currentActionEffectSquaddieTemplate,
    squaddieRepository,
    actionTemplateName,
    battleActionSquaddieChanges,
    actingBattleSquaddieId,
    actingContext,
}: {
    currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    battleActionSquaddieChanges: BattleActionSquaddieChange[]
    actingContext: BattleActionActionContext
    squaddieRepository: ObjectRepository
    actionTemplateName: string
    actingBattleSquaddieId: string
}): string[] => {
    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            actingBattleSquaddieId
        )
    )

    let output: string[] = []
    let actorUsesActionDescriptionText =
        ActionResultTextService.getSquaddieUsesActionString({
            squaddieTemplate: actingSquaddieTemplate,
            actionTemplateName,
            newline: false,
        })
    output.push(actorUsesActionDescriptionText)

    if (actingContext?.actingSquaddieRoll.occurred) {
        output.push(
            ActionResultTextService.getRollsDescriptionString({
                rolls: actingContext.actingSquaddieRoll.rolls,
                addSpacing: true,
            })
        )

        if (
            TraitStatusStorageService.getStatus(
                currentActionEffectSquaddieTemplate.traits,
                Trait.ATTACK
            ) === true &&
            TraitStatusStorageService.getStatus(
                currentActionEffectSquaddieTemplate.traits,
                Trait.ALWAYS_SUCCEEDS
            ) !== true
        ) {
            output.push(
                ...ActionResultText.getAttackPenaltyDescriptions(
                    actingContext.actingSquaddieModifiers
                )
            )
            output.push(
                ...ActionResultText.getActingSquaddieRollTotalIfNeeded(
                    actingContext
                )
            )
        }
    }

    battleActionSquaddieChanges.forEach(
        (squaddieChange: BattleActionSquaddieChange) => {
            const targetSquaddieId: string = squaddieChange.battleSquaddieId
            const { squaddieTemplate: targetSquaddieTemplate } =
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        squaddieRepository,
                        targetSquaddieId
                    )
                )

            const targetFoe =
                ActionEffectSquaddieTemplateService.doesItTargetFoes(
                    currentActionEffectSquaddieTemplate
                )

            const degreeOfSuccessIsCriticalFailure =
                squaddieChange.actorDegreeOfSuccess ===
                DegreeOfSuccess.CRITICAL_FAILURE
            const degreeOfSuccessIsFailure =
                squaddieChange.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE
            const degreeOfSuccessIsSuccess =
                squaddieChange.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS
            const degreeOfSuccessIsCriticalSuccess =
                squaddieChange.actorDegreeOfSuccess ===
                DegreeOfSuccess.CRITICAL_SUCCESS
            const noDamageTaken = squaddieChange.damage.net === 0

            if (targetFoe) {
                switch (true) {
                    case degreeOfSuccessIsFailure:
                        output.push(
                            ActionResultTextService.getHinderingActionMissedString(
                                {
                                    squaddieTemplate: targetSquaddieTemplate,
                                }
                            )
                        )
                        break
                    case degreeOfSuccessIsCriticalFailure:
                        output.push(
                            ActionResultTextService.getHinderingActionCriticallyMissedString(
                                { squaddieTemplate: targetSquaddieTemplate }
                            )
                        )
                        break
                    case noDamageTaken:
                        output.push(
                            ActionResultTextService.getHinderingActionDealtNoDamageString(
                                { squaddieTemplate: targetSquaddieTemplate }
                            )
                        )
                        break
                    case degreeOfSuccessIsCriticalSuccess:
                        output.push(
                            ActionResultTextService.getHinderingActionDealtCriticalDamageString(
                                {
                                    squaddieTemplate: targetSquaddieTemplate,
                                    damageTaken: squaddieChange.damage.net,
                                }
                            )
                        )
                        break
                    case degreeOfSuccessIsSuccess:
                        output.push(
                            ActionResultTextService.getHinderingActionDealtDamageString(
                                {
                                    squaddieTemplate: targetSquaddieTemplate,
                                    damageTaken: squaddieChange.damage.net,
                                }
                            )
                        )
                        break
                }
            }

            if (
                TraitStatusStorageService.getStatus(
                    currentActionEffectSquaddieTemplate.traits,
                    Trait.HEALING
                )
            ) {
                output.push(
                    ActionResultTextService.getHelpfulActionHealingReceivedString(
                        {
                            squaddieTemplate: targetSquaddieTemplate,
                            healingReceived: squaddieChange.healingReceived,
                        }
                    )
                )
            }
            output.push(
                ...getAttributeModifierChanges({
                    squaddieChange,
                    targetSquaddieTemplate,
                })
            )
        }
    )
    return output
}

const outputIntentForTextOnly = ({
    actionTemplate,
    currentActionEffectSquaddieTemplate,
    actingBattleSquaddieId,
    squaddieRepository,
    actingSquaddieModifiers,
}: {
    actionTemplate: ActionTemplate
    currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    actingBattleSquaddieId: string
    squaddieRepository: ObjectRepository
    actingSquaddieModifiers: AttributeTypeAndAmount[]
}): string[] => {
    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            actingBattleSquaddieId
        )
    )

    let output: string[] = []
    output.push(
        `${actingSquaddieTemplate.squaddieId.name} uses ${actionTemplate.name}`
    )
    if (
        TraitStatusStorageService.getStatus(
            currentActionEffectSquaddieTemplate.traits,
            Trait.ATTACK
        ) === true &&
        TraitStatusStorageService.getStatus(
            currentActionEffectSquaddieTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        ) !== true
    ) {
        output.push(
            ...ActionResultText.getAttackPenaltyDescriptions(
                actingSquaddieModifiers
            )
        )
    }

    return output
}
