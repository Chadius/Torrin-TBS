import { BattleSquaddie } from "../../battleSquaddie"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { Damage } from "../../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../../missionStatistics/missionStatistics"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import {
    DegreeOfSuccess,
    DegreeOfSuccessAndSuccessBonus,
    TDegreeOfSuccess,
} from "./degreeOfSuccess"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../stats/inBattleAttributes"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanation,
    DamageExplanationService,
} from "../../history/battleAction/battleActionSquaddieChange"
import { AttributeModifier } from "../../../squaddie/attribute/attributeModifier"
import { CalculatorAttack } from "./attack"
import { CalculatorMiscellaneous } from "./miscellaneous"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { ActionTemplate } from "../../../action/template/actionTemplate"
import {
    ActionEffectChange,
    CalculatedResult,
    CalculatedResultService,
} from "../../history/calculatedResult"
import { BattleActionActorContext } from "../../history/battleAction/battleActionActorContext"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attribute"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { BattleActionRecorder } from "../../history/battleAction/battleActionRecorder"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import {
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
} from "../../challengeModifier/challengeModifierSetting"

export interface CalculatedEffect {
    damage: DamageExplanation
    healingReceived: number
    attributeModifiersToAddToTarget: AttributeModifier[]
    degreeOfSuccess: TDegreeOfSuccess
}

export interface DegreeOfSuccessExplanation {
    [DegreeOfSuccess.CRITICAL_SUCCESS]?: number
    [DegreeOfSuccess.SUCCESS]?: number
    [DegreeOfSuccess.FAILURE]?: number
    [DegreeOfSuccess.CRITICAL_FAILURE]?: number
    [DegreeOfSuccess.NONE]?: number
}

export const ActionCalculator = {
    calculateAndApplyResults: ({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        battleActionRecorder,
        numberGenerator,
        missionStatistics,
        challengeModifierSetting,
    }: {
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        objectRepository: ObjectRepository
        missionStatistics: MissionStatistics
        challengeModifierSetting: ChallengeModifierSetting
    }): CalculatedResult =>
        calculateResults({
            battleActionRecorder,
            numberGenerator,
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            challengeModifierSetting,
            actionEffectChangeGenerator: ({
                actionEffectTemplate,
                actorBattleSquaddie,
                targetedBattleSquaddieIds,
                challengeModifierSetting,
            }: {
                actionEffectTemplate: ActionEffectTemplate
                actorBattleSquaddie: BattleSquaddie
                targetedBattleSquaddieIds: string[]
                challengeModifierSetting: ChallengeModifierSetting
            }): ActionEffectChange => {
                const change: ActionEffectChange =
                    applySquaddieChangesForThisEffectSquaddieTemplate({
                        actorInfo: {
                            actorBattleSquaddieId:
                                actorBattleSquaddie.battleSquaddieId,
                        },
                        targetInfo: {
                            targetedBattleSquaddieIds,
                        },
                        actionInfo: {
                            actionTemplateId:
                                BattleActionDecisionStepService.getAction(
                                    battleActionDecisionStep
                                ).actionTemplateId,
                            actionEffectTemplate,
                        },
                        battleActionRecorder,
                        numberGenerator,
                        challengeModifierSetting,
                        objectRepository,
                    })

                change.squaddieChanges.forEach((squaddieChange) =>
                    maybeUpdateMissionStatistics({
                        result: squaddieChange,
                        objectRepository,
                        missionStatistics,
                        actingBattleSquaddieId:
                            actorBattleSquaddie.battleSquaddieId,
                    })
                )

                return change
            },
        }),
    forecastResults: ({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        battleActionRecorder,
        numberGenerator,
    }: {
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }): CalculatedResult =>
        calculateResults({
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            battleActionRecorder,
            numberGenerator,
            challengeModifierSetting: ChallengeModifierSettingService.new(),
            actionEffectChangeGenerator: ({
                actionEffectTemplate,
                actorBattleSquaddie,
                actorSquaddieTemplate,
                targetedBattleSquaddieIds,
                battleActionRecorder,
                numberGenerator,
                objectRepository,
            }: {
                actionEffectTemplate: ActionEffectTemplate
                actorBattleSquaddie: BattleSquaddie
                actorSquaddieTemplate: SquaddieTemplate
                targetedBattleSquaddieIds: string[]
                battleActionRecorder: BattleActionRecorder
                numberGenerator: NumberGeneratorStrategy
                objectRepository: ObjectRepository
            }): ActionEffectChange =>
                forecastChangesForSquaddieAndActionEffectTemplate({
                    actionEffectTemplate,
                    actorBattleSquaddie,
                    targetedBattleSquaddieIds,
                    actorSquaddieTemplate,
                    battleActionRecorder,
                    numberGenerator,
                    objectRepository,
                }),
        }),
}

const getActorContext = ({
    actionEffectTemplate,
    actorSquaddieTemplate,
    battleActionRecorder,
    numberGenerator,
    objectRepository,
}: {
    actionEffectTemplate: ActionEffectTemplate
    actorSquaddieTemplate: SquaddieTemplate
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    objectRepository: ObjectRepository
}): BattleActionActorContext => {
    if (isAnAttack(actionEffectTemplate)) {
        return CalculatorAttack.getActorContext({
            actionEffectTemplate,
            actorSquaddieTemplate,
            numberGenerator,
            objectRepository,
            battleActionRecorder,
        })
    }
    return CalculatorMiscellaneous.getActorContext()
}

const getTargetContext = ({
    actionEffectTemplate,
    targetBattleSquaddie,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isAnAttack(actionEffectTemplate)) {
        return CalculatorAttack.getTargetSquaddieModifiers({
            actionEffectTemplate,
            targetBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.getTargetSquaddieModifiers({
        actionEffectTemplate,
        targetBattleSquaddie,
    })
}

const getDegreeOfSuccessAndSuccessBonus = ({
    actorInfo: { actorContext, actorBattleSquaddieId },
    targetInfo: { targetBattleSquaddieId },
    actionInfo: { actionEffectTemplate, actionTemplateId },
    challengeModifierSetting,
    objectRepository,
}: {
    actorInfo: {
        actorContext: BattleActionActorContext
        actorBattleSquaddieId: string
    }
    targetInfo: {
        targetBattleSquaddieId: string
    }
    actionInfo: {
        actionTemplateId: string
        actionEffectTemplate: ActionEffectTemplate
    }
    challengeModifierSetting: ChallengeModifierSetting
    objectRepository: ObjectRepository
}): DegreeOfSuccessAndSuccessBonus => {
    const { battleSquaddie: actorBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            actorBattleSquaddieId
        )
    )
    const {
        battleSquaddie: targetBattleSquaddie,
        squaddieTemplate: targetSquaddieTemplate,
    } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetBattleSquaddieId
        )
    )

    if (isAnAttack(actionEffectTemplate)) {
        const { didPreempt, newDegreeOfSuccess } =
            ChallengeModifierSettingService.preemptDegreeOfSuccessCalculation({
                challengeModifierSetting,
                objectRepository,
                actorBattleSquaddieId,
                targetBattleSquaddieId: targetBattleSquaddieId,
                actionTemplateId: actionTemplateId,
            })
        if (didPreempt)
            return { degreeOfSuccess: newDegreeOfSuccess, successBonus: -7 }

        return CalculatorAttack.getDegreeOfSuccess({
            actorBattleSquaddie,
            actionEffectTemplate,
            targetBattleSquaddie,
            targetSquaddieTemplate,
            actorContext,
        })
    }

    return CalculatorMiscellaneous.getDegreeOfSuccess({
        actorBattleSquaddie,
        actionEffectTemplate,
        targetBattleSquaddie,
        targetSquaddieTemplate,
        actorContext,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
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
}): CalculatedEffect => {
    if (isAnAttack(actionEffectTemplate)) {
        return CalculatorAttack.calculateEffectBasedOnDegreeOfSuccess({
            actionEffectTemplate,
            actorContext,
            degreeOfSuccess,
            targetSquaddieTemplate,
            targetBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess({
        actionEffectTemplate,
        actorContext,
        degreeOfSuccess,
        targetSquaddieTemplate,
        targetBattleSquaddie,
    })
}

const applyCalculatedEffectAndReturnChange = ({
    calculatedEffect,
    objectRepository,
    targetedBattleSquaddieId,
    successBonus,
}: {
    calculatedEffect: CalculatedEffect
    objectRepository: ObjectRepository
    targetedBattleSquaddieId: string
    successBonus: number
}) => {
    const { battleSquaddie: targetedBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetedBattleSquaddieId
        )
    )

    const changes = getBattleActionSquaddieChange({
        objectRepository,
        targetBattleSquaddieId: targetedBattleSquaddieId,
    })

    let inBattleAttributesToChange: InBattleAttributes =
        targetedBattleSquaddie.inBattleAttributes

    InBattleAttributesService.takeDamage({
        inBattleAttributes: inBattleAttributesToChange,
        damageToTake: calculatedEffect.damage.raw,
        damageType: Damage.UNKNOWN,
    })

    InBattleAttributesService.receiveHealing(
        inBattleAttributesToChange,
        calculatedEffect.healingReceived
    )

    calculatedEffect.attributeModifiersToAddToTarget.forEach((modifier) =>
        InBattleAttributesService.addActiveAttributeModifier(
            inBattleAttributesToChange,
            modifier
        )
    )

    changes.attributesAfter = InBattleAttributesService.clone(
        targetedBattleSquaddie.inBattleAttributes
    )

    return BattleActionSquaddieChangeService.new({
        battleSquaddieId: targetedBattleSquaddieId,
        healingReceived: calculatedEffect.healingReceived,
        damageExplanation: DamageExplanationService.new({
            raw: calculatedEffect.damage.raw,
            absorbed: calculatedEffect.damage.absorbed,
            net: calculatedEffect.damage.net,
        }),
        actorDegreeOfSuccess: calculatedEffect.degreeOfSuccess,
        successBonus,
        attributesBefore: changes.attributesBefore,
        attributesAfter: changes.attributesAfter,
    })
}

const maybeUpdateMissionStatistics = ({
    result,
    objectRepository,
    missionStatistics,
    actingBattleSquaddieId,
}: {
    objectRepository: ObjectRepository
    missionStatistics: MissionStatistics
    result: BattleActionSquaddieChange
    actingBattleSquaddieId: string
}) => {
    const { squaddieTemplate: targetedSquaddieTemplate } =
        getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                result.battleSquaddieId
            )
        )
    const healingReceived: number = result.healingReceived
    const damageDealt: number = result.damage.net

    if (
        targetedSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsService.addHealingReceivedByPlayerTeam(
            missionStatistics,
            healingReceived
        )
        MissionStatisticsService.addDamageTakenByPlayerTeam(
            missionStatistics,
            damageDealt
        )
        MissionStatisticsService.addDamageAbsorbedByPlayerTeam(
            missionStatistics,
            result.damage.absorbed
        )

        if (result.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
            MissionStatisticsService.incrementCriticalHitsTakenByPlayerTeam(
                missionStatistics
            )
        }
    }

    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            actingBattleSquaddieId
        )
    )
    if (
        actingSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsService.addDamageDealtByPlayerTeam(
            missionStatistics,
            damageDealt
        )

        if (result.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
            MissionStatisticsService.incrementCriticalHitsDealtByPlayerTeam(
                missionStatistics
            )
        }
    }
}

const getBattleSquaddieIdsAtGivenCoordinates = ({
    missionMap,
    mapCoordinates,
}: {
    missionMap: MissionMap
    mapCoordinates: HexCoordinate[]
}): string[] => {
    return mapCoordinates
        .map((coordinate) =>
            MissionMapService.getBattleSquaddieAtCoordinate(
                missionMap,
                coordinate
            )
        )
        .filter(MissionMapSquaddieCoordinateService.isValid)
        .map(
            (battleSquaddieLocation) => battleSquaddieLocation.battleSquaddieId
        )
}

const isAnAttack = (actionEffectTemplate: ActionEffectTemplate): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffectTemplate.traits,
        Trait.ATTACK
    )

const getBattleActionSquaddieChange = ({
    objectRepository,
    targetBattleSquaddieId,
}: {
    objectRepository: ObjectRepository
    targetBattleSquaddieId: string
}): BattleActionSquaddieChange => {
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetBattleSquaddieId
        )
    )
    return BattleActionSquaddieChangeService.new({
        battleSquaddieId: targetBattleSquaddieId,
        attributesBefore: InBattleAttributesService.clone(
            battleSquaddie.inBattleAttributes
        ),
        attributesAfter: undefined,
        damageExplanation: DamageExplanationService.new({
            net: 0,
        }),
        healingReceived: 0,
        actorDegreeOfSuccess: DegreeOfSuccess.NONE,
    })
}

const forecastCalculatedEffectAndReturnChange = ({
    calculatedEffect,
    targetedBattleSquaddieId,
    chanceOfDegreeOfSuccess,
    objectRepository,
}: {
    calculatedEffect: CalculatedEffect
    targetedBattleSquaddieId: string
    chanceOfDegreeOfSuccess: number
    objectRepository: ObjectRepository
}): BattleActionSquaddieChange => {
    const { battleSquaddie: targetedBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetedBattleSquaddieId
        )
    )

    const changes = getBattleActionSquaddieChange({
        objectRepository,
        targetBattleSquaddieId: targetedBattleSquaddieId,
    })

    let inBattleAttributesToChange: InBattleAttributes =
        InBattleAttributesService.clone(
            targetedBattleSquaddie.inBattleAttributes
        )

    InBattleAttributesService.takeDamage({
        inBattleAttributes: inBattleAttributesToChange,
        damageToTake: calculatedEffect.damage.raw,
        damageType: Damage.UNKNOWN,
    })

    InBattleAttributesService.receiveHealing(
        inBattleAttributesToChange,
        calculatedEffect.healingReceived
    )

    calculatedEffect.attributeModifiersToAddToTarget.forEach((modifier) =>
        InBattleAttributesService.addActiveAttributeModifier(
            inBattleAttributesToChange,
            modifier
        )
    )

    changes.attributesAfter = InBattleAttributesService.clone(
        inBattleAttributesToChange
    )

    return BattleActionSquaddieChangeService.new({
        battleSquaddieId: targetedBattleSquaddieId,
        healingReceived: calculatedEffect.healingReceived,
        damageExplanation: DamageExplanationService.new({
            raw: calculatedEffect.damage.raw,
            absorbed: calculatedEffect.damage.absorbed,
            net: calculatedEffect.damage.net,
            willKo: inBattleAttributesToChange.currentHitPoints <= 0,
        }),
        actorDegreeOfSuccess: calculatedEffect.degreeOfSuccess,
        attributesBefore: changes.attributesBefore,
        attributesAfter: changes.attributesAfter,
        chanceOfDegreeOfSuccess,
    })
}

const calculateResults = ({
    battleActionDecisionStep,
    objectRepository,
    actionEffectChangeGenerator,
    missionMap,
    battleActionRecorder,
    numberGenerator,
    challengeModifierSetting,
}: {
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    missionMap: MissionMap
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    challengeModifierSetting: ChallengeModifierSetting
    actionEffectChangeGenerator: ({
        actionEffectTemplate,
        actorBattleSquaddie,
        actorSquaddieTemplate,
        targetedBattleSquaddieIds,
        battleActionRecorder,
        numberGenerator,
        objectRepository,
        challengeModifierSetting,
    }: {
        actionEffectTemplate: ActionEffectTemplate
        actorBattleSquaddie: BattleSquaddie
        actorSquaddieTemplate: SquaddieTemplate
        targetedBattleSquaddieIds: string[]
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        objectRepository: ObjectRepository
        challengeModifierSetting: ChallengeModifierSetting
    }) => ActionEffectChange
}): CalculatedResult => {
    const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
        battleActionDecisionStep
    ).battleSquaddieId

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        battleActionDecisionStep
    ).actionTemplateId

    const targetCoordinate = BattleActionDecisionStepService.getTarget(
        battleActionDecisionStep
    ).targetCoordinate

    if (actionTemplateId === undefined || actorBattleSquaddieId === undefined) {
        return undefined
    }

    const {
        battleSquaddie: actorBattleSquaddie,
        squaddieTemplate: actorSquaddieTemplate,
    } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            actorBattleSquaddieId
        )
    )

    const actionTemplate: ActionTemplate =
        ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

    if (!actionTemplate) return undefined

    const changesPerEffect: ActionEffectChange[] =
        actionTemplate.actionEffectTemplates.reduce(
            (
                allChanges: ActionEffectChange[],
                actionEffectTemplate: ActionEffectTemplate
            ) => {
                const targetedBattleSquaddieIds =
                    getBattleSquaddieIdsAtGivenCoordinates({
                        missionMap,
                        mapCoordinates: [targetCoordinate],
                    })

                let change: ActionEffectChange = actionEffectChangeGenerator({
                    actionEffectTemplate,
                    actorBattleSquaddie,
                    actorSquaddieTemplate,
                    targetedBattleSquaddieIds,
                    battleActionRecorder,
                    numberGenerator,
                    objectRepository,
                    challengeModifierSetting,
                })

                allChanges.push(change)
                return allChanges
            },
            []
        )

    return CalculatedResultService.new({
        actorBattleSquaddieId: actorBattleSquaddieId,
        changesPerEffect,
    })
}

const forecastChangesForSquaddieAndActionEffectTemplate = ({
    actionEffectTemplate,
    actorBattleSquaddie,
    targetedBattleSquaddieIds,
    actorSquaddieTemplate,
    battleActionRecorder,
    numberGenerator,
    objectRepository,
}: {
    actionEffectTemplate: ActionEffectTemplate
    actorBattleSquaddie: BattleSquaddie
    actorSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddieIds: string[]
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    objectRepository: ObjectRepository
}): ActionEffectChange => {
    const actorContext = getActorContext({
        battleActionRecorder,
        numberGenerator,
        objectRepository,
        actionEffectTemplate,
        actorSquaddieTemplate,
    })

    const squaddieChanges: BattleActionSquaddieChange[] =
        targetedBattleSquaddieIds.reduce(
            (
                changes: BattleActionSquaddieChange[],
                targetedBattleSquaddieId
            ) => {
                const {
                    battleSquaddie: targetBattleSquaddie,
                    squaddieTemplate: targetSquaddieTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        targetedBattleSquaddieId
                    )
                )

                const possibleDegreesOfSuccess = getAllPossibleDegreesOfSuccess(
                    {
                        actionEffectTemplate,
                        targetBattleSquaddie,
                        actorBattleSquaddie,
                        actorContext,
                        targetSquaddieTemplate,
                    }
                )

                const changesForDegrees: BattleActionSquaddieChange[] =
                    Object.keys(possibleDegreesOfSuccess).map(
                        (degreeOfSuccess) => {
                            const calculatedEffect: CalculatedEffect =
                                calculateEffectBasedOnDegreeOfSuccess({
                                    actionEffectTemplate,
                                    actorContext,
                                    degreeOfSuccess:
                                        degreeOfSuccess as TDegreeOfSuccess,
                                    targetSquaddieTemplate,
                                    targetBattleSquaddie,
                                })
                            return forecastCalculatedEffectAndReturnChange({
                                calculatedEffect,
                                objectRepository,
                                targetedBattleSquaddieId,
                                chanceOfDegreeOfSuccess:
                                    possibleDegreesOfSuccess[
                                        degreeOfSuccess as TDegreeOfSuccess
                                    ],
                            })
                        }
                    )

                changes.push(...changesForDegrees)
                return changes
            },
            []
        )

    return {
        actorContext,
        squaddieChanges,
    }
}

const getAllPossibleDegreesOfSuccess = ({
    actionEffectTemplate,
    targetBattleSquaddie,
    actorBattleSquaddie,
    actorContext,
    targetSquaddieTemplate,
}: {
    actionEffectTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    actorBattleSquaddie: BattleSquaddie
    actorContext: BattleActionActorContext
    targetSquaddieTemplate: SquaddieTemplate
}): DegreeOfSuccessExplanation => {
    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.ALWAYS_SUCCEEDS
        ) === true
    ) {
        return {
            [DegreeOfSuccess.SUCCESS]: 36,
        }
    }

    let degreesOfSuccess: DegreeOfSuccessExplanation
    if (isAnAttack(actionEffectTemplate)) {
        degreesOfSuccess = CalculatorAttack.getAllPossibleDegreesOfSuccess({
            actorBattleSquaddie,
            actionEffectTemplate,
            targetBattleSquaddie,
            targetSquaddieTemplate,
            actorContext,
        })
    } else {
        degreesOfSuccess =
            CalculatorMiscellaneous.getAllPossibleDegreesOfSuccess({
                actorBattleSquaddie,
                actionEffectTemplate,
                targetBattleSquaddie,
                targetSquaddieTemplate,
                actorContext,
            })
    }

    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.CANNOT_CRITICALLY_FAIL
        ) === true
    ) {
        degreesOfSuccess[DegreeOfSuccess.FAILURE] +=
            degreesOfSuccess[DegreeOfSuccess.CRITICAL_FAILURE]
        degreesOfSuccess[DegreeOfSuccess.CRITICAL_FAILURE] = undefined
    }
    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.CANNOT_CRITICALLY_SUCCEED
        ) === true
    ) {
        degreesOfSuccess[DegreeOfSuccess.SUCCESS] +=
            degreesOfSuccess[DegreeOfSuccess.CRITICAL_SUCCESS]
        degreesOfSuccess[DegreeOfSuccess.CRITICAL_SUCCESS] = undefined
    }

    return Object.fromEntries(
        Object.entries(degreesOfSuccess).filter(
            ([_, chance]) => chance != undefined
        )
    )
}

const applySquaddieChangesForThisEffectSquaddieTemplate = ({
    actorInfo: { actorBattleSquaddieId },
    targetInfo: { targetedBattleSquaddieIds },
    actionInfo: { actionTemplateId, actionEffectTemplate },
    battleActionRecorder,
    numberGenerator,
    objectRepository,
    challengeModifierSetting,
}: {
    actorInfo: {
        actorBattleSquaddieId: string
    }
    targetInfo: {
        targetedBattleSquaddieIds: string[]
    }
    actionInfo: {
        actionTemplateId: string
        actionEffectTemplate: ActionEffectTemplate
    }
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    challengeModifierSetting: ChallengeModifierSetting
    objectRepository: ObjectRepository
}): ActionEffectChange => {
    const { squaddieTemplate: actorSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            actorBattleSquaddieId
        )
    )

    const actorContext = getActorContext({
        battleActionRecorder,
        numberGenerator,
        objectRepository,
        actionEffectTemplate,
        actorSquaddieTemplate,
    })

    const squaddieChanges: BattleActionSquaddieChange[] =
        targetedBattleSquaddieIds.reduce(
            (
                changes: BattleActionSquaddieChange[],
                targetedBattleSquaddieId
            ) => {
                const {
                    battleSquaddie: targetBattleSquaddie,
                    squaddieTemplate: targetSquaddieTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        targetedBattleSquaddieId
                    )
                )
                actorContext.targetAttributeModifiers[
                    targetedBattleSquaddieId
                ] = getTargetContext({
                    actionEffectTemplate,
                    targetBattleSquaddie,
                })

                const { degreeOfSuccess, successBonus } =
                    getDegreeOfSuccessAndSuccessBonus({
                        actorInfo: {
                            actorContext,
                            actorBattleSquaddieId,
                        },
                        targetInfo: {
                            targetBattleSquaddieId: targetedBattleSquaddieId,
                        },
                        actionInfo: {
                            actionTemplateId,
                            actionEffectTemplate,
                        },
                        challengeModifierSetting,
                        objectRepository,
                    })

                const calculatedEffect: CalculatedEffect =
                    calculateEffectBasedOnDegreeOfSuccess({
                        actionEffectTemplate,
                        actorContext,
                        degreeOfSuccess,
                        targetSquaddieTemplate,
                        targetBattleSquaddie,
                    })

                const squaddieChange = applyCalculatedEffectAndReturnChange({
                    calculatedEffect,
                    objectRepository,
                    targetedBattleSquaddieId,
                    successBonus,
                })

                changes.push(squaddieChange)
                return changes
            },
            []
        )

    return {
        actorContext,
        squaddieChanges,
    }
}
