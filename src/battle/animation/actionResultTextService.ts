import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ActionResultText } from "./actionAnimation/actionResultText"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { TRollModifier } from "../calculator/actionCalculator/rollResult"
import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../action/template/actionEffectTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { BattleActionSquaddieChange } from "../history/battleAction/battleActionSquaddieChange"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { AttributeModifierService } from "../../squaddie/attribute/attributeModifier"
import { BattleActionActorContext } from "../history/battleAction/battleActionActorContext"
import { SquaddieService } from "../../squaddie/squaddieService"
import {
    Attribute,
    AttributeTypeAndAmount,
    TAttribute,
} from "../../squaddie/attribute/attribute"

export const ActionResultTextService = {
    outputResultForTextOnly: ({
        currentActionEffectTemplate,
        squaddieRepository,
        actionTemplateName,
        battleActionSquaddieChanges,
        actingBattleSquaddieId,
        actorContext,
    }: {
        currentActionEffectTemplate: ActionEffectTemplate
        battleActionSquaddieChanges: BattleActionSquaddieChange[]
        actorContext: BattleActionActorContext | undefined
        squaddieRepository: ObjectRepository
        actionTemplateName: string
        actingBattleSquaddieId: string
    }): string[] => {
        return outputResultForTextOnly({
            actionTemplateName,
            currentActionEffectTemplate,
            battleActionSquaddieChanges,
            squaddieRepository,
            actorContext,
            actingBattleSquaddieId,
        })
    },
    outputIntentForTextOnly: ({
        actionTemplate,
        currentActionEffectTemplate,
        actingBattleSquaddieId,
        squaddieRepository,
        actingSquaddieModifiers,
        rollModifiers,
    }: {
        actionTemplate: ActionTemplate
        currentActionEffectTemplate: ActionEffectTemplate
        actingBattleSquaddieId: string
        squaddieRepository: ObjectRepository
        actingSquaddieModifiers: AttributeTypeAndAmount[]
        rollModifiers: { [r in TRollModifier]?: number }
    }): string[] => {
        return outputIntentForTextOnly({
            actionTemplate,
            currentActionEffectTemplate,
            actingBattleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers,
            rollModifiers,
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
    getBeforeActionText: ({
        targetTemplate,
        targetBattle,
        actionEffectSquaddieTemplate,
    }: {
        targetTemplate: SquaddieTemplate
        targetBattle: BattleSquaddie
        actionEffectSquaddieTemplate: ActionEffectTemplate
    }): string => {
        let targetBeforeActionText = `${targetTemplate.squaddieId.name}`

        const targetModifiers: {
            type: TAttribute
            amount: number
        }[] = InBattleAttributesService.calculateCurrentAttributeModifiers(
            targetBattle.inBattleAttributes
        )

        if (
            ActionEffectTemplateService.doesItTargetFoes(
                actionEffectSquaddieTemplate
            )
        ) {
            const armorClass = SquaddieService.getArmorClass({
                squaddieTemplate: targetTemplate,
                battleSquaddie: targetBattle,
            }).net
            const armorModifier =
                targetModifiers.find(
                    (modifier) => modifier.type === Attribute.ARMOR
                )?.amount || 0
            targetBeforeActionText += `\nArmor ${armorClass + armorModifier}`

            if (armorModifier) {
                targetBeforeActionText += `\n ${armorModifier > 0 ? "+" : ""}${armorModifier} Armor`
            }
            if (targetTemplate.attributes.tier != 0) {
                targetBeforeActionText += `\n +${targetTemplate.attributes.tier} Tier`
            }
        }

        return targetBeforeActionText
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

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            squaddieChange.attributesBefore,
            squaddieChange.attributesAfter
        )

    return attributeModifierDifferences.map((attributeModifierDifference) => {
        const afterAttribute =
            squaddieChange.attributesAfter?.attributeModifiers.find(
                (attributeModifier) =>
                    attributeModifier.type === attributeModifierDifference.type
            )

        const description = AttributeModifierService.readableDescription({
            type: attributeModifierDifference.type,
            amount: attributeModifierDifference.amount,
            source: afterAttribute?.source,
        })

        return `${targetSquaddieTemplate.squaddieId.name} ${description}`
    })
}

const outputResultForTextOnly = ({
    currentActionEffectTemplate,
    squaddieRepository,
    actionTemplateName,
    battleActionSquaddieChanges,
    actingBattleSquaddieId,
    actorContext,
}: {
    currentActionEffectTemplate: ActionEffectTemplate
    battleActionSquaddieChanges: BattleActionSquaddieChange[]
    actorContext: BattleActionActorContext | undefined
    squaddieRepository: ObjectRepository
    actionTemplateName: string
    actingBattleSquaddieId: string
}): string[] => {
    const { squaddieTemplate: actingSquaddieTemplate } =
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            actingBattleSquaddieId
        )

    let output: string[] = []
    let actorUsesActionDescriptionText =
        ActionResultTextService.getSquaddieUsesActionString({
            squaddieTemplate: actingSquaddieTemplate,
            actionTemplateName,
            newline: false,
        })
    output.push(actorUsesActionDescriptionText)

    if (actorContext?.actorRoll.occurred) {
        output.push(
            ActionResultTextService.getRollsDescriptionString({
                rolls: actorContext.actorRoll.rolls,
                addSpacing: true,
            })
        )

        if (
            TraitStatusStorageService.getStatus(
                currentActionEffectTemplate.traits,
                Trait.ATTACK
            ) &&
            !TraitStatusStorageService.getStatus(
                currentActionEffectTemplate.traits,
                Trait.ALWAYS_SUCCEEDS
            )
        ) {
            output.push(
                ...ActionResultText.getAttackPenaltyDescriptions(
                    actorContext.actorAttributeModifiers
                )
            )
            output.push(
                ...ActionResultText.getRollModifierDescriptions(
                    actorContext.actorRoll.rollModifiers
                )
            )
            output.push(
                ...ActionResultText.getActingSquaddieRollTotalIfNeeded(
                    actorContext
                )
            )
        }
    }

    battleActionSquaddieChanges.forEach(
        (squaddieChange: BattleActionSquaddieChange) => {
            const targetSquaddieId: string = squaddieChange.battleSquaddieId
            const { squaddieTemplate: targetSquaddieTemplate } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    targetSquaddieId
                )

            const targetFoe = ActionEffectTemplateService.doesItTargetFoes(
                currentActionEffectTemplate
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
                    currentActionEffectTemplate.traits,
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
    currentActionEffectTemplate,
    actingBattleSquaddieId,
    squaddieRepository,
    actingSquaddieModifiers,
    rollModifiers,
}: {
    actionTemplate: ActionTemplate
    currentActionEffectTemplate: ActionEffectTemplate
    actingBattleSquaddieId: string
    squaddieRepository: ObjectRepository
    actingSquaddieModifiers: AttributeTypeAndAmount[]
    rollModifiers: { [r in TRollModifier]?: number }
}): string[] => {
    const { squaddieTemplate: actingSquaddieTemplate } =
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            actingBattleSquaddieId
        )

    let output: string[] = []
    output.push(
        `${actingSquaddieTemplate.squaddieId.name} uses ${actionTemplate.name}`
    )
    if (
        TraitStatusStorageService.getStatus(
            currentActionEffectTemplate.traits,
            Trait.ATTACK
        ) &&
        !TraitStatusStorageService.getStatus(
            currentActionEffectTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        )
    ) {
        output.push(
            ...ActionResultText.getAttackPenaltyDescriptions(
                actingSquaddieModifiers
            )
        )
        output.push(
            ...ActionResultText.getRollModifierDescriptions(rollModifiers)
        )
    }

    return output
}
