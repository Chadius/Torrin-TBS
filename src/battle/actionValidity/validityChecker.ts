import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieCanPerformActionCheck } from "./squaddieCanPerformActionCheck"
import { TActionPerformFailureReason } from "../../squaddie/turn"
import { PerRoundCheck } from "./perRoundCheck"
import { CanAttackTargetsCheck } from "./canAttackTargetsCheck"
import { CanHealTargetCheck } from "./canHealTargetCheck"
import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { BattleActionRecorder } from "../history/battleAction/battleActionRecorder"
import {
    TargetingResults,
    TargetingResultsService,
} from "../targeting/targetingService"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { CanAddModifiersCheck } from "./canAddModifiersCheck"
import { MissionMap } from "../../missionMap/missionMap"

export type ActionValidityStatus = {
    isValid: boolean
    warning: boolean
    messages: string[]
}

export type ActionCheckResult = {
    isValid: boolean
    warning?: boolean
    reason?: TActionPerformFailureReason
    message?: string
}

export const ValidityCheckService = {
    calculateActionValidity: ({
        objectRepository,
        battleSquaddieId,
        battleActionRecorder,
        missionMap,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        battleActionRecorder: BattleActionRecorder
        missionMap: MissionMap
    }): {
        [actionTemplateId: string]: ActionValidityStatus
    } => {
        const overallStatus: {
            [actionTemplateId: string]: ActionValidityStatus
        } = {}

        const { battleSquaddie, squaddieTemplate } =
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )

        squaddieTemplate.actionTemplateIds.forEach(
            (actionTemplateId: string) => {
                overallStatus[actionTemplateId] = {
                    isValid: true,
                    warning: false,
                    messages: [],
                }

                const actionTemplate =
                    ObjectRepositoryService.getActionTemplateById(
                        objectRepository,
                        actionTemplateId
                    )
                if (!actionTemplate) {
                    overallStatus[actionTemplateId] = {
                        isValid: true,
                        warning: false,
                        messages: [
                            `action template not found: ${actionTemplateId}`,
                        ],
                    }
                }

                const actorCanAffordToUseTheActionCheckResults =
                    checkIfActorCanAffordToUseTheAction({
                        battleSquaddie,
                        actionTemplate,
                        battleActionRecorder,
                    })

                actorCanAffordToUseTheActionCheckResults.forEach((result) => {
                    overallStatus[actionTemplateId] = updateActionStatus(
                        overallStatus[actionTemplateId],
                        result,
                        true
                    )
                })

                if (!overallStatus[actionTemplateId].isValid) return

                const validTargetResults =
                    TargetingResultsService.findValidTargets({
                        map: missionMap,
                        actingBattleSquaddie: battleSquaddie,
                        actingSquaddieTemplate: squaddieTemplate,
                        actionTemplate,
                        squaddieRepository: objectRepository,
                    })

                const affectTargetsCheckResult =
                    checkIfTargetsInRangeCouldBeAffectedByAction({
                        actionTemplate,
                        objectRepository,
                        validTargetResults,
                    })

                affectTargetsCheckResult.forEach((result) => {
                    overallStatus[actionTemplateId] = updateActionStatus(
                        overallStatus[actionTemplateId],
                        result,
                        true
                    )
                })
            }
        )

        return overallStatus
    },
}

const checkIfActorCanAffordToUseTheAction = ({
    battleSquaddie,
    actionTemplate,
    battleActionRecorder,
}: {
    battleSquaddie: BattleSquaddie
    actionTemplate: ActionTemplate
    battleActionRecorder: BattleActionRecorder
}): ActionCheckResult[] => {
    return [
        SquaddieCanPerformActionCheck.canPerform({
            battleSquaddie,
            actionTemplate,
        }),

        PerRoundCheck.withinLimitedUsesThisRound({
            battleActionRecorder,
            actionTemplate,
        }),
    ]
}

const checkIfTargetsInRangeCouldBeAffectedByAction = ({
    actionTemplate,
    objectRepository,
    validTargetResults,
}: {
    actionTemplate: ActionTemplate
    objectRepository: ObjectRepository
    validTargetResults: TargetingResults
}): (ActionCheckResult | undefined)[] => {
    if (
        ActionEffectTemplateService.doesItTargetFoes(
            actionTemplate.actionEffectTemplates[0]
        )
    ) {
        return [
            CanAttackTargetsCheck.targetsAreInRangeOfThisAttack({
                objectRepository,
                actionTemplateId: actionTemplate.id,
                validTargetResults,
            }),
        ]
    }

    const actionWillTryToHeal =
        ActionTemplateService.getTotalHealing(actionTemplate) > 0
    const actionWillTryToAddModifiers =
        ActionTemplateService.getAttributeModifiers(actionTemplate).length > 0
    if (!actionWillTryToHeal && !actionWillTryToAddModifiers) {
        return [
            {
                isValid: true,
            },
        ]
    }

    const healCheck = actionWillTryToHeal
        ? CanHealTargetCheck.targetInRangeCanBeAffected({
              validTargetResults,
              objectRepository,
              actionTemplate,
          })
        : undefined

    const addAttributeModifiersCheck = actionWillTryToAddModifiers
        ? CanAddModifiersCheck.canAddAttributeModifiers({
              actionTemplate,
              objectRepository,
              validTargetResults,
          })
        : undefined

    let actionWillHeal = actionWillTryToHeal && healCheck?.isValid
    let actionWillModify =
        actionWillTryToAddModifiers && addAttributeModifiersCheck?.isValid
    if (actionWillHeal || actionWillModify) {
        return [
            {
                ...healCheck,
                isValid: true,
            },
            {
                ...addAttributeModifiersCheck,
                isValid: true,
            },
        ]
    }

    if (actionWillTryToHeal && !healCheck?.isValid) {
        if (
            actionWillTryToAddModifiers &&
            !addAttributeModifiersCheck?.isValid
        ) {
            return [healCheck, addAttributeModifiersCheck]
        }
        return [healCheck]
    }

    return [addAttributeModifiersCheck]
}

const updateActionStatus = (
    currentStatus: ActionValidityStatus,
    actionCheckResult: ActionCheckResult | undefined,
    shouldDisableIfInvalid: boolean
): ActionValidityStatus => {
    if (shouldDisableIfInvalid && actionCheckResult?.isValid === false) {
        currentStatus.isValid = false
    }

    if (actionCheckResult?.warning) {
        currentStatus.warning = true
    }

    if (actionCheckResult?.message) {
        currentStatus.messages.push(actionCheckResult.message)
    }
    return currentStatus
}
