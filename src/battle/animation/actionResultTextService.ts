import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { ACTOR_MODIFIER } from "../modifierConstants"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ActionResultText } from "./actionAnimation/actionResultText"
import {
    DegreeOfSuccess,
    DegreeOfSuccessService,
} from "../actionCalculator/degreeOfSuccess"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { RollResultService } from "../actionCalculator/rollResult"
import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { BattleActionSquaddieChange } from "../history/battleActionSquaddieChange"

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
        actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number }
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

        if (
            ActionEffectSquaddieTemplateService.isHindering(
                actionEffectSquaddieTemplate
            )
        ) {
            targetBeforeActionText += `\nAC ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`
        }

        return targetBeforeActionText
    },
    getAfterActionText: ({
        result,
    }: {
        result: BattleActionSquaddieChange
    }): string => {
        let targetAfterActionText = ""

        switch (result.actorDegreeOfSuccess) {
            case DegreeOfSuccess.FAILURE:
                targetAfterActionText = `MISS`
                break
            case DegreeOfSuccess.CRITICAL_SUCCESS:
                let damageText = "CRITICAL HIT!\n"
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

        if (
            ActionEffectSquaddieTemplateService.isHindering(
                currentActionEffectSquaddieTemplate
            )
        ) {
            if (
                DegreeOfSuccessService.atBestFailure(
                    squaddieChange.actorDegreeOfSuccess
                )
            ) {
                if (
                    squaddieChange.actorDegreeOfSuccess ===
                    DegreeOfSuccess.FAILURE
                ) {
                    output.push(
                        ActionResultTextService.getHinderingActionMissedString({
                            squaddieTemplate: targetSquaddieTemplate,
                        })
                    )
                } else {
                    output.push(
                        ActionResultTextService.getHinderingActionCriticallyMissedString(
                            { squaddieTemplate: targetSquaddieTemplate }
                        )
                    )
                }
            } else if (squaddieChange.damageTaken === 0) {
                output.push(
                    ActionResultTextService.getHinderingActionDealtNoDamageString(
                        { squaddieTemplate: targetSquaddieTemplate }
                    )
                )
            } else {
                if (
                    squaddieChange.actorDegreeOfSuccess ===
                    DegreeOfSuccess.CRITICAL_SUCCESS
                ) {
                    output.push(
                        ActionResultTextService.getHinderingActionDealtCriticalDamageString(
                            {
                                squaddieTemplate: targetSquaddieTemplate,
                                damageTaken: squaddieChange.damageTaken,
                            }
                        )
                    )
                } else {
                    output.push(
                        ActionResultTextService.getHinderingActionDealtDamageString(
                            {
                                squaddieTemplate: targetSquaddieTemplate,
                                damageTaken: squaddieChange.damageTaken,
                            }
                        )
                    )
                }
            }
        }
        if (
            ActionEffectSquaddieTemplateService.isHelpful(
                currentActionEffectSquaddieTemplate
            )
        ) {
            output.push(
                ActionResultTextService.getHelpfulActionHealingReceivedString({
                    squaddieTemplate: targetSquaddieTemplate,
                    healingReceived: squaddieChange.healingReceived,
                })
            )
        }
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
    actingSquaddieModifiers: { [modifier in ACTOR_MODIFIER]?: number }
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
