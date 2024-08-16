import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { DamageType } from "../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionStatisticsHandler } from "../missionStatistics/missionStatistics"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../history/squaddieSquaddieResults"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ObjectRepositoryService } from "../objectRepository"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionsThisRound } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { DecidedActionEffect } from "../../action/decided/decidedActionEffect"
import { MissionMapService } from "../../missionMap/missionMap"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../history/battleActionSquaddieChange"
import { BattleActionActionContext } from "../history/battleAction"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"
import { DecidedActionSquaddieEffect } from "../../action/decided/decidedActionSquaddieEffect"
import { CalculatorAttack } from "./attack"
import { CalculatorMiscellaneous } from "./miscellaneous"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"

export interface CalculatedEffect {
    damageDealt: number
    healingReceived: number
    attributeModifiersToAddToTarget: AttributeModifier[]
    degreeOfSuccess: DegreeOfSuccess
}

export const ActionCalculator = {
    calculateResults: ({
        gameEngineState,
        actingBattleSquaddie,
        validTargetLocation,
        actionEffect,
        actionsThisRound,
    }: {
        gameEngineState: GameEngineState
        actingBattleSquaddie: BattleSquaddie
        validTargetLocation: HexCoordinate
        actionsThisRound: ActionsThisRound
        actionEffect: DecidedActionEffect
    }): SquaddieSquaddieResults => {
        return calculateResults({
            gameEngineState: gameEngineState,
            actingBattleSquaddie,
            validTargetLocation,
            actionsThisRound,
            actionEffect,
        })
    },
}

const calculateResults = ({
    gameEngineState,
    actingBattleSquaddie,
    validTargetLocation,
    actionsThisRound,
    actionEffect,
}: {
    gameEngineState: GameEngineState
    actingBattleSquaddie: BattleSquaddie
    validTargetLocation: HexCoordinate
    actionsThisRound: ActionsThisRound
    actionEffect: DecidedActionEffect
}): SquaddieSquaddieResults => {
    if (actionEffect?.type !== ActionEffectType.SQUADDIE) {
        return
    }
    const actionEffectSquaddie: DecidedActionSquaddieEffect = actionEffect

    const targetedBattleSquaddieIds = getBattleSquaddieIdsAtGivenLocations({
        gameEngineState,
        locations: [validTargetLocation],
    })

    const actionContext = getActorContext({
        gameEngineState,
        actionEffect: actionEffectSquaddie,
        actionsThisRound,
    })

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
                actionEffect: actionEffectSquaddie,
                targetedBattleSquaddie,
            })
        const degreeOfSuccess = getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffect,
            targetedBattleSquaddie,
            actionContext,
        })

        const calculatedEffect: CalculatedEffect =
            calculateEffectBasedOnDegreeOfSuccess({
                actionEffect,
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

    return SquaddieSquaddieResultsService.new({
        actingBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        targetedBattleSquaddieIds: targetedBattleSquaddieIds,
        squaddieChanges,
        actionContext,
    })
}

const getActorContext = ({
    gameEngineState,
    actionsThisRound,
    actionEffect,
}: {
    gameEngineState: GameEngineState
    actionsThisRound: ActionsThisRound
    actionEffect: DecidedActionSquaddieEffect
}): BattleActionActionContext => {
    if (isAnAttack(actionEffect)) {
        return CalculatorAttack.getActorContext({
            actionEffect,
            gameEngineState,
            actionsThisRound,
        })
    }
    return CalculatorMiscellaneous.getActorContext({
        actionEffect,
        gameEngineState,
        actionsThisRound,
    })
}

const getTargetContext = ({
    actionEffect,
    targetedBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    targetedBattleSquaddie: BattleSquaddie
}): AttributeTypeAndAmount[] => {
    if (isAnAttack(actionEffect)) {
        return CalculatorAttack.getTargetSquaddieModifiers({
            actionEffect,
            targetedBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.getTargetSquaddieModifiers({
        actionEffect,
        targetedBattleSquaddie,
    })
}

const getDegreeOfSuccess = ({
    actionEffect,
    targetedBattleSquaddie,
    actionContext,
    actingBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    targetedBattleSquaddie: BattleSquaddie
    actingBattleSquaddie: BattleSquaddie
    actionContext: BattleActionActionContext
}): DegreeOfSuccess => {
    if (isAnAttack(actionEffect)) {
        return CalculatorAttack.getDegreeOfSuccess({
            actingBattleSquaddie,
            actionEffect,
            targetedBattleSquaddie,
            actionContext,
        })
    }

    return CalculatorMiscellaneous.getDegreeOfSuccess({
        actingBattleSquaddie,
        actionEffect,
        targetedBattleSquaddie,
        actionContext,
    })
}

const calculateEffectBasedOnDegreeOfSuccess = ({
    actionEffect,
    actionContext,
    degreeOfSuccess,
    targetedSquaddieTemplate,
    targetedBattleSquaddie,
}: {
    actionEffect: DecidedActionSquaddieEffect
    actionContext: BattleActionActionContext
    degreeOfSuccess: DegreeOfSuccess
    targetedSquaddieTemplate: SquaddieTemplate
    targetedBattleSquaddie: BattleSquaddie
}): CalculatedEffect => {
    if (isAnAttack(actionEffect)) {
        return CalculatorAttack.calculateEffectBasedOnDegreeOfSuccess({
            actionEffect,
            actionContext,
            degreeOfSuccess,
            targetedSquaddieTemplate,
            targetedBattleSquaddie,
        })
    }

    return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess({
        actionEffect,
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

    InBattleAttributesService.takeDamage(
        targetedBattleSquaddie.inBattleAttributes,
        calculatedEffect.damageDealt,
        DamageType.UNKNOWN
    )
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
        damageTaken: calculatedEffect.damageDealt,
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
    const damageDealt: number = result.damageTaken

    if (
        targetedSquaddieTemplate.squaddieId.affiliation ===
        SquaddieAffiliation.PLAYER
    ) {
        MissionStatisticsHandler.addHealingReceivedByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            healingReceived
        )
        MissionStatisticsHandler.addDamageTakenByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            damageDealt
        )
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
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(
            gameEngineState.battleOrchestratorState.battleState
                .missionStatistics,
            damageDealt
        )
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

const isAnAttack = (actionEffect: DecidedActionSquaddieEffect): boolean =>
    TraitStatusStorageService.getStatus(
        actionEffect.template.traits,
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
    return {
        battleSquaddieId: targetBattleSquaddieId,
        attributesBefore: InBattleAttributesService.clone(
            battleSquaddie.inBattleAttributes
        ),
        attributesAfter: undefined,
        damageTaken: 0,
        healingReceived: 0,
        actorDegreeOfSuccess: DegreeOfSuccess.NONE,
    }
}
