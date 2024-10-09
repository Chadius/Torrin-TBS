import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { ProcessedActionEffect } from "../../action/processed/processedActionEffect"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import {
    MULTIPLE_ATTACK_PENALTY,
    MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX,
} from "./battleAction/battleAction"

export interface ActionsThisRound {
    battleSquaddieId: string
    startingLocation: HexCoordinate
    processedActions: ProcessedAction[]
    previewedActionTemplateId: string
    processedActionEffectIteratorIndex: number
}

export const ActionsThisRoundService = {
    new: ({
        battleSquaddieId,
        startingLocation,
        processedActions,
        previewedActionTemplateId,
    }: {
        battleSquaddieId: string
        startingLocation: HexCoordinate
        processedActions?: ProcessedAction[]
        previewedActionTemplateId?: string
    }): ActionsThisRound => {
        return sanitize({
            battleSquaddieId,
            startingLocation,
            processedActions,
            previewedActionTemplateId: previewedActionTemplateId,
            processedActionEffectIteratorIndex: 0,
        })
    },
    getMultipleAttackPenaltyForProcessedActions: (
        actionsForThisRound: ActionsThisRound
    ): {
        penaltyMultiplier: number
        multipleAttackPenalty: number
    } => {
        return getMultipleAttackPenaltyForProcessedActions(actionsForThisRound)
    },
    getProcessedActionToShow: (
        actionsThisRound: ActionsThisRound
    ): ProcessedAction => {
        return getProcessedActionAndActionEffectToShow(actionsThisRound)
            .processedAction
    },
    getProcessedActionEffectToShow: (
        actionsThisRound: ActionsThisRound
    ): ProcessedActionEffect => {
        return getProcessedActionAndActionEffectToShow(actionsThisRound)
            .processedActionEffect
    },
    nextProcessedActionEffectToShow: (actionsThisRound: ActionsThisRound) => {
        if (!isValidValue(actionsThisRound)) {
            return
        }

        actionsThisRound.processedActionEffectIteratorIndex++
    },
    updateActionsThisRound: ({
        state,
        battleSquaddieId,
        startingLocation,
        processedAction,
        previewedActionTemplateId,
    }: {
        state: GameEngineState
        battleSquaddieId: string
        startingLocation: HexCoordinate
        processedAction?: ProcessedAction
        previewedActionTemplateId?: string
    }) => {
        if (OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
            if (isValidValue(processedAction)) {
                state.battleOrchestratorState.battleState.actionsThisRound.processedActions.push(
                    processedAction
                )
            }
            if (isValidValue(previewedActionTemplateId)) {
                state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId =
                    previewedActionTemplateId
            }
            return
        }

        const processedActions = processedAction ? [processedAction] : undefined
        state.battleOrchestratorState.battleState.actionsThisRound =
            ActionsThisRoundService.new({
                battleSquaddieId: battleSquaddieId,
                startingLocation: startingLocation,
                processedActions,
                previewedActionTemplateId,
            })
    },
}

const sanitize = (actions: ActionsThisRound): ActionsThisRound => {
    if (!isValidValue(actions.battleSquaddieId)) {
        throw new Error(
            "ActionsThisRound cannot sanitize, missing battleSquaddieId"
        )
    }

    if (!isValidValue(actions.startingLocation)) {
        throw new Error(
            "ActionsThisRound cannot sanitize, missing startingLocation"
        )
    }

    const hasPreviewedActionTemplateId =
        isValidValue(actions.previewedActionTemplateId) &&
        actions.previewedActionTemplateId !== ""
    const hasProcessedActions =
        isValidValue(actions.processedActions) &&
        actions.processedActions.length > 0

    if (!(hasPreviewedActionTemplateId || hasProcessedActions)) {
        throw new Error(
            "ActionsThisRound cannot sanitize, needs either previewedActionTemplateId OR processedActions"
        )
    }

    actions.processedActions = getValidValueOrDefault(
        actions.processedActions,
        []
    )

    return actions
}

const getMultipleAttackPenaltyForProcessedActions = (
    actionsThisRound: ActionsThisRound
): {
    penaltyMultiplier: number
    multipleAttackPenalty: number
} => {
    if (!isValidValue(actionsThisRound)) {
        return convertRawPenaltyMultiplier(0)
    }

    let penaltyMultiplier = actionsThisRound.processedActions.reduce(
        (accumulator: number, processedAction: ProcessedAction) => {
            return (
                accumulator +
                ProcessedActionService.multipleAttackPenaltyMultiplier(
                    processedAction
                )
            )
        },
        0
    )

    return convertRawPenaltyMultiplier(penaltyMultiplier)
}

const convertRawPenaltyMultiplier = (
    penaltyMultiplier: number
): {
    penaltyMultiplier: number
    multipleAttackPenalty: number
} => {
    penaltyMultiplier = Math.min(
        penaltyMultiplier,
        MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX
    )

    const multipleAttackPenalty =
        penaltyMultiplier * MULTIPLE_ATTACK_PENALTY === -0
            ? 0
            : penaltyMultiplier * MULTIPLE_ATTACK_PENALTY

    return {
        penaltyMultiplier,
        multipleAttackPenalty,
    }
}

const getProcessedActionAndActionEffectToShow = (
    actionsThisRound: ActionsThisRound
): {
    processedAction: ProcessedAction
    processedActionEffect: ProcessedActionEffect
} => {
    if (!isValidValue(actionsThisRound)) {
        return {
            processedAction: undefined,
            processedActionEffect: undefined,
        }
    }

    if (actionsThisRound.processedActions.length < 1) {
        return {
            processedAction: undefined,
            processedActionEffect: undefined,
        }
    }

    let countDown = actionsThisRound.processedActionEffectIteratorIndex
    for (const processedAction of actionsThisRound.processedActions) {
        if (countDown < processedAction.processedActionEffects.length) {
            return {
                processedAction,
                processedActionEffect:
                    processedAction.processedActionEffects[countDown],
            }
        }

        countDown -= processedAction.processedActionEffects.length
    }

    return {
        processedAction: undefined,
        processedActionEffect: undefined,
    }
}
