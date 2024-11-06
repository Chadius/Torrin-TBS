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
import { MissionMapSquaddieLocationService } from "../../../missionMap/squaddieLocation"
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
import { ActionEffectSquaddieTemplate } from "../../../action/template/actionEffectSquaddieTemplate"
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
        validTargetLocation,
        battleActionDecisionStep,
    }: {
        gameEngineState: GameEngineState
        actingBattleSquaddie: BattleSquaddie
        validTargetLocation: HexCoordinate
        battleActionDecisionStep: BattleActionDecisionStep
    }): SquaddieSquaddieResults[] => {
        return calculateResults({
            gameEngineState: gameEngineState,
            actingBattleSquaddie,
            validTargetLocation,
            battleActionDecisionStep,
        })
    },
}

const calculateResults = ({
    gameEngineState,
    actingBattleSquaddie,
    validTargetLocation,
    battleActionDecisionStep,
}: {
    gameEngineState: GameEngineState
    actingBattleSquaddie: BattleSquaddie
    validTargetLocation: HexCoordinate
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

    return ActionTemplateService.getActionEffectSquaddieTemplates(
        actionTemplate
    ).map((actionEffectSquaddieTemplate) => {
        const targetedBattleSquaddieIds = getBattleSquaddieIdsAtGivenLocations({
            gameEngineState,
            locations: [validTargetLocation],
        })

        const actionContext = getActorContext({
            gameEngineState,
            actionEffectSquaddieTemplate,
        })
        const squaddieChanges = getSquaddieChangesForThisEffectSquaddieTemplate(
            targetedBattleSquaddieIds,
            gameEngineState,
            actionContext,
            actionEffectSquaddieTemplate,
            actingBattleSquaddie
        )

        return SquaddieSquaddieResultsService.new({
            actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
            targetedBattleSquaddieIds: targetedBattleSquaddieIds,
            squaddieChanges,
            actionContext,
        })
    })
}

const getActorContext = ({
    gameEngineState,
    actionEffectSquaddieTemplate,
}: {
    gameEngineState: GameEngineState
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
}): BattleActionActionContext => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.getActorContext({
            actionEffectSquaddieTemplate,
            gameEngineState,
        })
    }
    return CalculatorMiscellaneous.getActorContext({
        actionEffectSquaddieTemplate,
        gameEngineState,
    })
}

const getTargetContext = ({
    actionEffectSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.getTargetSquaddieModifiers({
            actionEffectSquaddieTemplate,
            targetedBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.getTargetSquaddieModifiers({
        actionEffectSquaddieTemplate,
        targetedBattleSquaddie,
    })
}

const getDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    targetedBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
}): DegreeOfSuccess => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffectSquaddieTemplate,
            targetedBattleSquaddie,
            actionContext,
        })
    }

    return CalculatorMiscellaneous.getDegreeOfSuccess({
        actingBattleSquaddie,
        actionEffectSquaddieTemplate,
        targetedBattleSquaddie,
        actionContext,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffectSquaddieTemplate,
    actionContext,
    degreeOfSuccess,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    if (isAnAttack(actionEffectSquaddieTemplate)) {
        return CalculatorAttack.calculateEffectBasedOnDegreeOfSuccess({
            actionEffectSquaddieTemplate,
            actionContext,
            degreeOfSuccess,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess({
        actionEffectSquaddieTemplate,
        actionContext,
        degreeOfSuccess,
        targetedSquaddieTemplate,
        targetedBattleSquaddie,
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

const getBattleSquaddieIdsAtGivenLocations = ({
    gameEngineState,
    locations,
}: {
    locations: { q: number; r: number }[]
    gameEngineState: GameEngineState
}): string[] => {
    return locations
        .map((location) =>
            MissionMapService.getBattleSquaddieAtLocation(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                location
            )
        )
        .filter(MissionMapSquaddieLocationService.isValid)
        .map(
            (battleSquaddieLocation) => battleSquaddieLocation.battleSquaddieId
        )
}

const isAnAttack = (
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
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
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
    actingBattleSquaddie: BattleSquaddie
) => {
    const squaddieChanges: BattleActionSquaddieChange[] = []

    targetedBattleSquaddieIds.forEach((targetedBattleSquaddieId) => {
        const {
            battleSquaddie: targetedBattleSquaddie,
            squaddieTemplate: targetedSquaddieTemplate,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                targetedBattleSquaddieId
            )
        )

        actionContext.targetSquaddieModifiers[targetedBattleSquaddieId] =
            getTargetContext({
                actionEffectSquaddieTemplate,
                targetedBattleSquaddie,
            })
        const degreeOfSuccess = getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffectSquaddieTemplate,
            targetedBattleSquaddie,
            actionContext,
        })

        const calculatedEffect: CalculatedEffect =
            calculateEffectBasedOnDegreeOfSuccess({
                actionEffectSquaddieTemplate,
                actionContext,
                degreeOfSuccess,
                targetedSquaddieTemplate,
                targetedBattleSquaddie,
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
