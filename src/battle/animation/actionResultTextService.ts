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
import { BattleActionSquaddieChange } from "../history/battleActionSquaddieChange"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    AttributeSource,
    AttributeType,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"

export const ActionResultTextService = {
    outputResultForTextOnly: ({
        currentActionEffectSquaddieTemplate,
        result,
        squaddieRepository,
        actionTemplateName,
    }: {
        currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        result: SquaddieSquaddieResults
        squaddieRepository: ObjectRepository
        actionTemplateName: string
    }): string[] => {
        return outputResultForTextOnly({
            actionTemplateName,
            currentActionEffectSquaddieTemplate,
            result,
            squaddieRepository,
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

            actorUsesActionDescriptionText += `\n${ActionResultText.getActingSquaddieRollTotalIfNeeded(results)}`

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
                if (result.damageTaken === 0 && result.healingReceived === 0) {
                    damageText += `NO DAMAGE`
                } else if (result.damageTaken > 0) {
                    damageText += `${result.damageTaken} damage`
                }
                targetAfterActionText = damageText
                break
            case DegreeOfSuccess.CRITICAL_FAILURE:
                targetAfterActionText = `CRITICAL MISS!!`
                break
            case DegreeOfSuccess.SUCCESS:
                if (result.damageTaken === 0 && result.healingReceived === 0) {
                    targetAfterActionText = `NO DAMAGE`
                } else if (result.damageTaken > 0) {
                    targetAfterActionText = `${result.damageTaken} damage`
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
    }
    const attributeSourceToStringMapping: {
        [t in AttributeSource]?: string
    } = {
        [AttributeSource.CIRCUMSTANCE]: "Circumstance",
    }

    return squaddieChange.attributesAfter.attributeModifiers.map(
        (attribute) =>
            `${targetSquaddieTemplate.squaddieId.name} ${attributeTypeToStringMapping[attribute.type] || attribute.type} ${attribute.amount > 0 ? "+" : ""}${attribute.amount} (${attributeSourceToStringMapping[attribute.source] || attribute.source})`
    )
}

const outputResultForTextOnly = ({
    currentActionEffectSquaddieTemplate,
    result,
    squaddieRepository,
    actionTemplateName,
}: {
    currentActionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    result: SquaddieSquaddieResults
    squaddieRepository: ObjectRepository
    actionTemplateName: string
}): string[] => {
    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            result.actingBattleSquaddieId
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

    if (result.actingContext.actingSquaddieRoll.occurred) {
        output.push(
            ActionResultTextService.getRollsDescriptionString({
                rolls: result.actingContext.actingSquaddieRoll.rolls,
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
                    result.actingContext.actingSquaddieModifiers
                )
            )
            output.push(
                ...ActionResultText.getActingSquaddieRollTotalIfNeeded(result)
            )
        }
    }

    result.targetedBattleSquaddieIds.forEach((targetSquaddieId: string) => {
        const { squaddieTemplate: targetSquaddieTemplate } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    targetSquaddieId
                )
            )
        const squaddieChange = result.squaddieChanges.find(
            (change) => change.battleSquaddieId === targetSquaddieId
        )

        const targetFoe = ActionEffectSquaddieTemplateService.doesItTargetFoes(
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
        const noDamageTaken = squaddieChange.damageTaken === 0

        if (targetFoe) {
            switch (true) {
                case degreeOfSuccessIsFailure:
                    output.push(
                        ActionResultTextService.getHinderingActionMissedString({
                            squaddieTemplate: targetSquaddieTemplate,
                        })
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
                                damageTaken: squaddieChange.damageTaken,
                            }
                        )
                    )
                    break
                case degreeOfSuccessIsSuccess:
                    output.push(
                        ActionResultTextService.getHinderingActionDealtDamageString(
                            {
                                squaddieTemplate: targetSquaddieTemplate,
                                damageTaken: squaddieChange.damageTaken,
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
                ActionResultTextService.getHelpfulActionHealingReceivedString({
                    squaddieTemplate: targetSquaddieTemplate,
                    healingReceived: squaddieChange.healingReceived,
                })
            )
        }
        output.push(
            ...getAttributeModifierChanges({
                squaddieChange,
                targetSquaddieTemplate,
            })
        )
    })

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
