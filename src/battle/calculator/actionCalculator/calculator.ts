import { BattleSquaddie } from "../../battleSquaddie"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { DamageType } from "../../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionStatisticsService } from "../../missionStatistics/missionStatistics"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../../history/squaddieSquaddieResults"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { ObjectRepositoryService } from "../../objectRepository"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { MissionMapService } from "../../../missionMap/missionMap"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
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
import { BattleActionDecisionStep } from "../../actionDecision/battleActionDecisionStep"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { BattleActionActionContext } from "../../history/battleAction/battleActionActionContext"

export interface CalculatedEffect {
    damage: DamageExplanation
    healingReceived: number
    attributeModifiersToAddToTarget: AttributeModifier[]
    degreeOfSuccess: DegreeOfSuccess
}

export const ActionCalculator = {
    calculateResults: ({
        gameEngineState,
        actingBattleSquaddie,
        validTargetCoordinate,
        battleActionDecisionStep,
    }: {
        gameEngineState: GameEngineState
        actingBattleSquaddie: BattleSquaddie
        validTargetCoordinate: HexCoordinate
        battleActionDecisionStep: BattleActionDecisionStep
    }): SquaddieSquaddieResults[] => {
        return calculateResults({
            gameEngineState: gameEngineState,
            actingBattleSquaddie,
            validTargetCoordinate,
            battleActionDecisionStep,
        })
    },
}

const calculateResults = ({
    gameEngineState,
    actingBattleSquaddie,
    validTargetCoordinate,
    battleActionDecisionStep,
}: {
    gameEngineState: GameEngineState
    actingBattleSquaddie: BattleSquaddie
    validTargetCoordinate: HexCoordinate
    battleActionDecisionStep: BattleActionDecisionStep
}): SquaddieSquaddieResults[] => {
    if (battleActionDecisionStep.action.actionTemplateId === undefined) {
        return undefined
    }

    const actionTemplate: ActionTemplate =
        ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            battleActionDecisionStep.action.actionTemplateId
        )

    return ActionTemplateService.getActionEffectTemplates(actionTemplate).map(
        (actionEffectTemplate) => {
            const targetedBattleSquaddieIds =
                getBattleSquaddieIdsAtGivenCoordinates({
                    gameEngineState,
                    coordinates: [validTargetCoordinate],
                })

            const actionContext = getActorContext({
                gameEngineState,
                actionEffectTemplate: actionEffectTemplate,
                actorBattleSquaddie: actingBattleSquaddie,
            })
            const squaddieChanges =
                getSquaddieChangesForThisEffectSquaddieTemplate(
                    targetedBattleSquaddieIds,
                    gameEngineState,
                    actionContext,
                    actionEffectTemplate,
                    actingBattleSquaddie
                )

            return SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
                targetedBattleSquaddieIds: targetedBattleSquaddieIds,
                squaddieChanges,
                actionContext,
            })
        }
    )
}

const getActorContext = ({
    gameEngineState,
    actionEffectTemplate,
    actorBattleSquaddie,
}: {
    gameEngineState: GameEngineState
    actionEffectTemplate: ActionEffectTemplate
    actorBattleSquaddie: BattleSquaddie
}): BattleActionActionContext => {
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
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.getTargetSquaddieModifiers({
            actionEffectSquaddieTemplate,
            targetBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.getTargetSquaddieModifiers({
        actionEffectSquaddieTemplate,
        targetBattleSquaddie,
    })
}

const getDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    targetBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
    targetSquaddieTemplate,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    targetBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
    targetSquaddieTemplate: SquaddieTemplate
}): DegreeOfSuccess => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffectSquaddieTemplate,
            targetBattleSquaddie,
            targetSquaddieTemplate,
            actionContext,
        })
    }

    return CalculatorMiscellaneous.getDegreeOfSuccess({
        actingBattleSquaddie,
        actionEffectSquaddieTemplate,
        targetBattleSquaddie,
        targetSquaddieTemplate,
        actionContext,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    actionContext,
    degreeOfSuccess,
    targetSquaddieTemplate,
    targetBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectTemplate
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetSquaddieTemplate: SquaddieTemplate
    targetBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.calculateEffectBasedOnDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            degreeOfSuccess,
            targetSquaddieTemplate,
            targetBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess({
        actionEffectSquaddieTemplate,
        actionContext,
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

    InBattleAttributesService.takeDamage({
        inBattleAttributes: targetedBattleSquaddie.inBattleAttributes,
        damageToTake: calculatedEffect.damage.raw,
        damageType: DamageType.UNKNOWN,
    })

    InBattleAttributesService.receiveHealing(
        targetedBattleSquaddie.inBattleAttributes,
        calculatedEffect.healingReceived
    )

    calculatedEffect.attributeModifiersToAddToTarget.forEach((modifier) =>
        InBattleAttributesService.addActiveAttributeModifier(
            targetedBattleSquaddie.inBattleAttributes,
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

const isAnAttack = (
    actionEffectSquaddieTemplate: ActionEffectTemplate
): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffectSquaddieTemplate.traits,
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

const getSquaddieChangesForThisEffectSquaddieTemplate = (
    targetedBattleSquaddieIds: string[],
    gameEngineState: GameEngineState,
    actionContext: BattleActionActionContext,
    actionEffectSquaddieTemplate: ActionEffectTemplate,
    actingBattleSquaddie: BattleSquaddie
) => {
    const squaddieChanges: BattleActionSquaddieChange[] = []

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const {
            battleSquaddie: targetBattleSquaddie,
            squaddieTemplate: targetSquaddieTemplate,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                targetedBattleSquaddieId
            )
        )

        actionContext.targetAttributeModifiers[targetedBattleSquaddieId] =
            getTargetContext({
                actionEffectSquaddieTemplate,
                targetBattleSquaddie,
            })
        const degreeOfSuccess = getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffectSquaddieTemplate,
            targetBattleSquaddie,
            targetSquaddieTemplate,
            actionContext,
        })

        const calculatedEffect: CalculatedEffect =
            calculateEffectBasedOnDegreeOfSuccess({
                actionEffectSquaddieTemplate,
                actionContext,
                degreeOfSuccess,
                targetSquaddieTemplate,
                targetBattleSquaddie,
            })

        const squaddieChange = applyCalculatedEffectAndReturnChange({
            calculatedEffect,
            gameEngineState,
            targetedBattleSquaddieId,
        })

        squaddieChanges.push(squaddieChange)

        maybeUpdateMissionStatistics({
            result: squaddieChange,
            gameEngineState,
            actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        })
    })
    return squaddieChanges
}
