import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/objectValidityCheck"

export interface BattleActionDecisionStep {
    actor: BattleActionDecisionStepActor | undefined
    action: BattleActionDecisionStepAction | undefined
    target: BattleActionDecisionStepTarget | undefined
}

export interface BattleActionDecisionStepActor {
    battleSquaddieId: string
}

export interface BattleActionDecisionStepAction {
    actionTemplateId?: string
    movement?: boolean
    endTurn?: boolean
}

export interface BattleActionDecisionStepTarget {
    targetCoordinate?: HexCoordinate
    confirmed: boolean
}

const isTargetConsidered = (
    actionBuilderState: BattleActionDecisionStep
): boolean =>
    isValidValue(actionBuilderState) && isValidValue(actionBuilderState.target)

const setConsideredTarget = (
    actionBuilderState: BattleActionDecisionStep,
    targetCoordinate: HexCoordinate | undefined
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    actionBuilderState.target = {
        targetCoordinate: targetCoordinate,
        confirmed: false,
    }
}

const isActorSet = (actionBuilderState: BattleActionDecisionStep): boolean =>
    (actionBuilderState?.actor &&
        actionBuilderState?.actor?.battleSquaddieId !== "") ||
    false

const isTargetConfirmed = (
    actionBuilderState: BattleActionDecisionStep
): boolean =>
    (isTargetConsidered(actionBuilderState) &&
        actionBuilderState?.target?.confirmed) ||
    false

const isActionSet = (actionBuilderState: BattleActionDecisionStep): boolean =>
    (actionBuilderState?.action &&
        (isValidValue(actionBuilderState?.action.actionTemplateId) ||
            actionBuilderState?.action.endTurn ||
            actionBuilderState?.action.movement)) ||
    false

const setConfirmedTarget = (
    actionBuilderState: BattleActionDecisionStep,
    targetCoordinate: HexCoordinate | undefined
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    setConsideredTarget(actionBuilderState, targetCoordinate)
    if (actionBuilderState.target) actionBuilderState.target.confirmed = true
}

export const BattleActionDecisionStepService = {
    new: (): BattleActionDecisionStep => ({
        actor: undefined,
        action: undefined,
        target: undefined,
    }),
    reset: (battleActionDecisionStep: BattleActionDecisionStep) => {
        battleActionDecisionStep.actor = undefined
        battleActionDecisionStep.action = undefined
        battleActionDecisionStep.target = undefined
    },
    copy: (from: BattleActionDecisionStep, to: BattleActionDecisionStep) => {
        Object.assign(to, from)
    },
    isSquaddieActionRecordNotSet: (
        actionBuilderState: BattleActionDecisionStep
    ): boolean => {
        return (
            !isValidValue(actionBuilderState) ||
            (!isActorSet(actionBuilderState) &&
                !isActionSet(actionBuilderState) &&
                !isTargetConfirmed(actionBuilderState))
        )
    },
    isActionRecordComplete: (
        actionBuilderState: BattleActionDecisionStep
    ): boolean => {
        return (
            (isValidValue(actionBuilderState) &&
                isActorSet(actionBuilderState) &&
                isActionSet(actionBuilderState) &&
                isTargetConfirmed(actionBuilderState)) ||
            false
        )
    },
    isActorSet: (actionBuilderState: BattleActionDecisionStep): boolean => {
        return isActorSet(actionBuilderState)
    },
    isTargetConfirmed: (
        actionBuilderState: BattleActionDecisionStep
    ): boolean => isTargetConfirmed(actionBuilderState),
    setActor: ({
        actionDecisionStep,
        battleSquaddieId,
    }: {
        actionDecisionStep: BattleActionDecisionStep
        battleSquaddieId: string
    }) => {
        if (!isValidValue(actionDecisionStep)) {
            return
        }
        actionDecisionStep.actor = {
            battleSquaddieId,
        }
    },
    getActor: (
        actionDecisionStep: BattleActionDecisionStep
    ): BattleActionDecisionStepActor | undefined => actionDecisionStep?.actor,
    addAction: ({
        actionDecisionStep,
        actionTemplateId,
        movement,
        endTurn,
    }: {
        actionDecisionStep: BattleActionDecisionStep
        actionTemplateId?: string
        movement?: boolean
        endTurn?: boolean
    }) => {
        if (!isValidValue(actionDecisionStep)) {
            return
        }
        const actionTemplateIsSet = isValidValue(actionTemplateId)
        const movementIsSet = movement !== undefined
        const endTurnIsSet = endTurn !== undefined

        if (!(actionTemplateIsSet || movementIsSet || endTurnIsSet)) {
            throw new Error(
                "addAction: missing actionTemplate, movement or end turn"
            )
        }

        actionDecisionStep.action = {
            actionTemplateId,
            movement,
            endTurn,
        }

        if (endTurn) {
            setConfirmedTarget(actionDecisionStep, undefined)
        }
    },
    setConsideredTarget: ({
        actionDecisionStep,
        targetCoordinate,
    }: {
        targetCoordinate: HexCoordinate
        actionDecisionStep: BattleActionDecisionStep
    }) => {
        setConsideredTarget(actionDecisionStep, targetCoordinate)
    },
    getTarget: (
        actionDecisionStep: BattleActionDecisionStep
    ): BattleActionDecisionStepTarget | undefined => actionDecisionStep?.target,
    setConfirmedTarget: ({
        actionDecisionStep,
        targetCoordinate,
    }: {
        targetCoordinate: HexCoordinate | undefined
        actionDecisionStep: BattleActionDecisionStep
    }) => {
        setConfirmedTarget(actionDecisionStep, targetCoordinate)
    },
    getAction: (
        actionDecisionStep: BattleActionDecisionStep
    ): BattleActionDecisionStepAction | undefined => actionDecisionStep?.action,
    isTargetConsidered: (
        actionDecisionStep: BattleActionDecisionStep
    ): boolean => {
        return isTargetConsidered(actionDecisionStep)
    },
    isActionSet: (actionDecisionStep: BattleActionDecisionStep): boolean =>
        isActionSet(actionDecisionStep),
    confirmAlreadyConsideredTarget: ({
        actionDecisionStep,
    }: {
        actionDecisionStep: BattleActionDecisionStep
    }): boolean => {
        if (!isActionSet(actionDecisionStep)) {
            return false
        }
        if (
            isTargetConsidered(actionDecisionStep) &&
            actionDecisionStep.target
        ) {
            actionDecisionStep.target.confirmed = true
            return true
        }
        return false
    },
    removeAction: ({
        actionDecisionStep,
    }: {
        actionDecisionStep: BattleActionDecisionStep
    }) => {
        if (!isValidValue(actionDecisionStep)) {
            return
        }
        actionDecisionStep.action = undefined
    },
    removeTarget: ({
        actionDecisionStep,
    }: {
        actionDecisionStep: BattleActionDecisionStep
    }) => {
        if (!isValidValue(actionDecisionStep)) {
            return
        }
        actionDecisionStep.target = undefined
    },
}
