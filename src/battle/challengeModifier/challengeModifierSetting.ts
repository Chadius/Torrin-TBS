import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { BattleEvent } from "../event/battleEvent"
import { ChallengeModifierEffect } from "../event/eventEffect/challengeModifierEffect/challengeModifierEffect"

export enum ChallengeModifierType {
    TRAINING_WHEELS = "TRAINING_WHEELS",
}

export type ChallengeModifierValue = boolean

export interface ChallengeModifierSetting {
    [ChallengeModifierType.TRAINING_WHEELS]: boolean
}

export const ChallengeModifierSettingService = {
    new: () => newChallengeModifierSetting(),
    getSetting: (
        challengeModifierSetting: ChallengeModifierSetting,
        type: ChallengeModifierType
    ): ChallengeModifierValue => {
        if (!challengeModifierSetting) return undefined
        return challengeModifierSetting[type]
    },
    setSetting: ({
        challengeModifierSetting,
        type,
        value,
    }: {
        challengeModifierSetting: ChallengeModifierSetting
        type: ChallengeModifierType
        value: ChallengeModifierValue
    }) => setSetting({ challengeModifierSetting, type, value }),
    preemptDegreeOfSuccessCalculation: ({
        challengeModifierSetting,
        objectRepository,
        actorBattleSquaddieId,
        targetBattleSquaddieId,
        actionTemplateId,
    }: {
        challengeModifierSetting: ChallengeModifierSetting
        objectRepository: ObjectRepository
        actorBattleSquaddieId: string
        targetBattleSquaddieId: string
        actionTemplateId: string
    }): { didPreempt: boolean; newDegreeOfSuccess: DegreeOfSuccess } => {
        if (
            !challengeModifierSetting ||
            !challengeModifierSetting[ChallengeModifierType.TRAINING_WHEELS]
        )
            return {
                didPreempt: false,
                newDegreeOfSuccess: DegreeOfSuccess.NONE,
            }

        return preemptDegreeOfSuccessWithTrainingWheels({
            targetBattleSquaddieId,
            actorBattleSquaddieId,
            objectRepository,
            actionTemplateId,
        })
    },
    processBattleEvents: (
        challengeModifierSetting: ChallengeModifierSetting,
        battleEvents: (BattleEvent & { effect: ChallengeModifierEffect })[]
    ) => {
        battleEvents.forEach((battleEvent) => {
            setSetting({
                challengeModifierSetting,
                type: battleEvent.effect.challengeModifierType,
                value: battleEvent.effect.value,
            })
        })
    },
    clone: (
        challengeModifierSetting: ChallengeModifierSetting
    ): ChallengeModifierSetting => {
        const clone = newChallengeModifierSetting()
        Object.entries(challengeModifierSetting).forEach(
            ([challengeModifierType, value]: [
                ChallengeModifierType,
                ChallengeModifierValue,
            ]) => {
                setSetting({
                    challengeModifierSetting: clone,
                    type: challengeModifierType,
                    value,
                })
            }
        )
        return clone
    },
}

const setSetting = ({
    challengeModifierSetting,
    type,
    value,
}: {
    challengeModifierSetting: ChallengeModifierSetting
    type: ChallengeModifierType
    value: ChallengeModifierValue
}) => {
    if (!challengeModifierSetting) return
    challengeModifierSetting[type] = value
}

const preemptDegreeOfSuccessWithTrainingWheels = ({
    objectRepository,
    actorBattleSquaddieId,
    targetBattleSquaddieId,
    actionTemplateId,
}: {
    objectRepository: ObjectRepository
    actorBattleSquaddieId: string
    targetBattleSquaddieId: string
    actionTemplateId: string
}): { didPreempt: boolean; newDegreeOfSuccess: DegreeOfSuccess } => {
    const { squaddieTemplate: actorSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            actorBattleSquaddieId
        )
    )
    const { squaddieTemplate: targetSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetBattleSquaddieId
        )
    )

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        objectRepository,
        actionTemplateId
    )

    if (
        actorSquaddieTemplate.squaddieId.affiliation ==
        SquaddieAffiliation.PLAYER
    ) {
        if (
            SquaddieAffiliationService.areSquaddieAffiliationsAllies({
                actingAffiliation: actorSquaddieTemplate.squaddieId.affiliation,
                targetAffiliation:
                    targetSquaddieTemplate.squaddieId.affiliation,
            })
        )
            return {
                didPreempt: false,
                newDegreeOfSuccess: DegreeOfSuccess.NONE,
            }

        return {
            didPreempt: true,
            newDegreeOfSuccess: TraitStatusStorageService.getStatus(
                actionTemplate.actionEffectTemplates[0].traits,
                Trait.CANNOT_CRITICALLY_SUCCEED
            )
                ? DegreeOfSuccess.SUCCESS
                : DegreeOfSuccess.CRITICAL_SUCCESS,
        }
    }

    if (
        [SquaddieAffiliation.PLAYER].includes(
            targetSquaddieTemplate.squaddieId.affiliation
        )
    )
        return {
            didPreempt: true,
            newDegreeOfSuccess: TraitStatusStorageService.getStatus(
                actionTemplate.actionEffectTemplates[0].traits,
                Trait.CANNOT_CRITICALLY_FAIL
            )
                ? DegreeOfSuccess.FAILURE
                : DegreeOfSuccess.CRITICAL_FAILURE,
        }

    return { didPreempt: false, newDegreeOfSuccess: DegreeOfSuccess.NONE }
}

const newChallengeModifierSetting = (): ChallengeModifierSetting => {
    return { [ChallengeModifierType.TRAINING_WHEELS]: false }
}
