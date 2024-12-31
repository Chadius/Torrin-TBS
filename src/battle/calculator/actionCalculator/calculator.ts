import { BattleSquaddie } from "../../battleSquaddie"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { DamageType } from "../../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionStatisticsService } from "../../missionStatistics/missionStatistics"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { ObjectRepositoryService } from "../../objectRepository"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { MissionMapService } from "../../../missionMap/missionMap"
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
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { CalculatorAttack } from "./attack"
import { CalculatorMiscellaneous } from "./miscellaneous"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { ActionTemplate } from "../../../action/template/actionTemplate"
import {
    ActionEffectChange,
    CalculatedResult,
    CalculatedResultService,
} from "../../history/calculatedResult"
import { BattleActionActorContext } from "../../history/battleAction/battleActionActorContext"

export interface CalculatedEffect {
    damage: DamageExplanation
    healingReceived: number
    attributeModifiersToAddToTarget: AttributeModifier[]
    degreeOfSuccess: DegreeOfSuccess
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
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }): CalculatedResult =>
        calculateResults({
            gameEngineState,
            actionEffectChangeGenerator: ({
                gameEngineState,
                actionEffectTemplate,
                actorBattleSquaddie,
                targetedBattleSquaddieIds,
            }: {
                gameEngineState: GameEngineState
                actionEffectTemplate: ActionEffectTemplate
                actorBattleSquaddie: BattleSquaddie
                targetedBattleSquaddieIds: string[]
            }): ActionEffectChange => {
                const change: ActionEffectChange =
                    applySquaddieChangesForThisEffectSquaddieTemplate2({
                        targetedBattleSquaddieIds,
                        gameEngineState,
                        actionEffectTemplate,
                        actorBattleSquaddie,
                    })

                change.squaddieChanges.forEach((squaddieChange) =>
                    maybeUpdateMissionStatistics({
                        result: squaddieChange,
                        gameEngineState,
                        actingBattleSquaddieId:
                            actorBattleSquaddie.battleSquaddieId,
                    })
                )

                return change
            },
        }),
    forecastResults: ({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }): CalculatedResult =>
        calculateResults({
            gameEngineState,
            actionEffectChangeGenerator: ({
                gameEngineState,
                actionEffectTemplate,
                actorBattleSquaddie,
                targetedBattleSquaddieIds,
            }: {
                gameEngineState: GameEngineState
                actionEffectTemplate: ActionEffectTemplate
                actorBattleSquaddie: BattleSquaddie
                targetedBattleSquaddieIds: string[]
            }): ActionEffectChange =>
                forecastChangesForSquaddieAndActionEffectTemplate({
                    gameEngineState,
                    actionEffectTemplate,
                    actorBattleSquaddie,
                    targetedBattleSquaddieIds,
                }),
        }),
}

const getActorContext = ({
    gameEngineState,
    actionEffectTemplate,
    actorBattleSquaddie,
}: {
    gameEngineState: GameEngineState
    actionEffectTemplate: ActionEffectTemplate
    actorBattleSquaddie: BattleSquaddie
}): BattleActionActorContext => {
    if (isAnAttack(actionEffectTemplate)) {
        return CalculatorAttack.getActorContext({
            actionEffectTemplate,
            gameEngineState,
            actorBattleSquaddie,
        })
    }
    return CalculatorMiscellaneous.getActorContext({
        actionEffectTemplate,
        gameEngineState,
    })
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

const getDegreeOfSuccessExplanation = ({
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
}): DegreeOfSuccess => {
    if (isAnAttack(actionEffectTemplate)) {
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
    degreeOfSuccess: DegreeOfSuccess
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
    gameEngineState,
    targetedBattleSquaddieId,
}: {
    calculatedEffect: CalculatedEffect
    gameEngineState: GameEngineState
    targetedBattleSquaddieId: string
}) => {
    const { battleSquaddie: targetedBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            targetedBattleSquaddieId
        )
    )

    const changes = getBattleActionSquaddieChange({
        gameEngineState,
        targetBattleSquaddieId: targetedBattleSquaddieId,
    })

    let inBattleAttributesToChange: InBattleAttributes =
        targetedBattleSquaddie.inBattleAttributes

    InBattleAttributesService.takeDamage({
        inBattleAttributes: inBattleAttributesToChange,
        damageToTake: calculatedEffect.damage.raw,
        damageType: DamageType.UNKNOWN,
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
        attributesBefore: changes.attributesBefore,
        attributesAfter: changes.attributesAfter,
    })
}

const maybeUpdateMissionStatistics = ({
    result,
    gameEngineState,
    actingBattleSquaddieId,
}: {
    result: BattleActionSquaddieChange
    gameEngineState: GameEngineState
    actingBattleSquaddieId: string
}) => {
    const { squaddieTemplate: targetedSquaddieTemplate } =
        getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
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
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            healingReceived
        )
        MissionStatisticsService.addDamageTakenByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            damageDealt
        )
        MissionStatisticsService.addDamageAbsorbedByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            result.damage.absorbed
        )

        if (result.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
            MissionStatisticsService.incrementCriticalHitsTakenByPlayerTeam(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics
            )
        }
    }

    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actingBattleSquaddieId
        )
    )
    if (
        actingSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsService.addDamageDealtByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            damageDealt
        )

        if (result.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
            MissionStatisticsService.incrementCriticalHitsDealtByPlayerTeam(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics
            )
        }
    }
}

const getBattleSquaddieIdsAtGivenCoordinates = ({
    gameEngineState,
    coordinates,
}: {
    coordinates: { q: number; r: number }[]
    gameEngineState: GameEngineState
}): string[] => {
    return coordinates
        .map((coordinate) =>
            MissionMapService.getBattleSquaddieAtCoordinate(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
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
    gameEngineState,
    targetBattleSquaddieId,
}: {
    gameEngineState: GameEngineState
    targetBattleSquaddieId: string
}): BattleActionSquaddieChange => {
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
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
    gameEngineState,
    targetedBattleSquaddieId,
    chanceOfDegreeOfSuccess,
}: {
    calculatedEffect: CalculatedEffect
    gameEngineState: GameEngineState
    targetedBattleSquaddieId: string
    chanceOfDegreeOfSuccess: number
}): BattleActionSquaddieChange => {
    const { battleSquaddie: targetedBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            targetedBattleSquaddieId
        )
    )

    const changes = getBattleActionSquaddieChange({
        gameEngineState,
        targetBattleSquaddieId: targetedBattleSquaddieId,
    })

    let inBattleAttributesToChange: InBattleAttributes =
        InBattleAttributesService.clone(
            targetedBattleSquaddie.inBattleAttributes
        )

    InBattleAttributesService.takeDamage({
        inBattleAttributes: inBattleAttributesToChange,
        damageToTake: calculatedEffect.damage.raw,
        damageType: DamageType.UNKNOWN,
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
        }),
        actorDegreeOfSuccess: calculatedEffect.degreeOfSuccess,
        attributesBefore: changes.attributesBefore,
        attributesAfter: changes.attributesAfter,
        chanceOfDegreeOfSuccess,
    })
}

const calculateResults = ({
    gameEngineState,
    actionEffectChangeGenerator,
}: {
    gameEngineState: GameEngineState
    actionEffectChangeGenerator: ({
        gameEngineState,
        actionEffectTemplate,
        actorBattleSquaddie,
        targetedBattleSquaddieIds,
    }: {
        gameEngineState: GameEngineState
        actionEffectTemplate: ActionEffectTemplate
        actorBattleSquaddie: BattleSquaddie
        targetedBattleSquaddieIds: string[]
    }) => ActionEffectChange
}): CalculatedResult => {
    const actorBattleSquaddieId = BattleActionDecisionStepService.getActor(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).battleSquaddieId

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).actionTemplateId

    const targetCoordinate = BattleActionDecisionStepService.getTarget(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).targetCoordinate

    if (actionTemplateId === undefined || actorBattleSquaddieId === undefined) {
        return undefined
    }

    const { battleSquaddie: actorBattleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actorBattleSquaddieId
        )
    )

    const actionTemplate: ActionTemplate =
        ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
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
                        gameEngineState,
                        coordinates: [targetCoordinate],
                    })

                let change: ActionEffectChange = actionEffectChangeGenerator({
                    gameEngineState,
                    actionEffectTemplate,
                    actorBattleSquaddie,
                    targetedBattleSquaddieIds,
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
    gameEngineState,
    actionEffectTemplate,
    actorBattleSquaddie,
    targetedBattleSquaddieIds,
}: {
    gameEngineState: GameEngineState
    actionEffectTemplate: ActionEffectTemplate
    actorBattleSquaddie: BattleSquaddie
    targetedBattleSquaddieIds: string[]
}): ActionEffectChange => {
    const actorContext = getActorContext({
        gameEngineState,
        actionEffectTemplate: actionEffectTemplate,
        actorBattleSquaddie: actorBattleSquaddie,
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
                        gameEngineState.repository,
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
                                        degreeOfSuccess as DegreeOfSuccess,
                                    targetSquaddieTemplate,
                                    targetBattleSquaddie,
                                })
                            return forecastCalculatedEffectAndReturnChange({
                                calculatedEffect,
                                gameEngineState,
                                targetedBattleSquaddieId,
                                chanceOfDegreeOfSuccess:
                                    possibleDegreesOfSuccess[
                                        degreeOfSuccess as DegreeOfSuccess
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
        degreesOfSuccess[DegreeOfSuccess.CRITICAL_FAILURE] = 0
    }
    if (
        TraitStatusStorageService.getStatus(
            actionEffectTemplate.traits,
            Trait.CANNOT_CRITICALLY_SUCCEED
        ) === true
    ) {
        degreesOfSuccess[DegreeOfSuccess.SUCCESS] +=
            degreesOfSuccess[DegreeOfSuccess.CRITICAL_SUCCESS]
        degreesOfSuccess[DegreeOfSuccess.CRITICAL_SUCCESS] = 0
    }

    return Object.fromEntries(
        Object.entries(degreesOfSuccess).filter(([_, chance]) => chance > 0)
    )
}

const applySquaddieChangesForThisEffectSquaddieTemplate2 = ({
    gameEngineState,
    actionEffectTemplate,
    actorBattleSquaddie,
    targetedBattleSquaddieIds,
}: {
    targetedBattleSquaddieIds: string[]
    gameEngineState: GameEngineState
    actionEffectTemplate: ActionEffectTemplate
    actorBattleSquaddie: BattleSquaddie
}): ActionEffectChange => {
    const actorContext = getActorContext({
        gameEngineState,
        actionEffectTemplate: actionEffectTemplate,
        actorBattleSquaddie: actorBattleSquaddie,
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
                        gameEngineState.repository,
                        targetedBattleSquaddieId
                    )
                )
                actorContext.targetAttributeModifiers[
                    targetedBattleSquaddieId
                ] = getTargetContext({
                    actionEffectTemplate,
                    targetBattleSquaddie,
                })
                const degreeOfSuccess = getDegreeOfSuccessExplanation({
                    actorBattleSquaddie,
                    actionEffectTemplate,
                    targetBattleSquaddie,
                    targetSquaddieTemplate,
                    actorContext,
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
                    gameEngineState,
                    targetedBattleSquaddieId,
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
