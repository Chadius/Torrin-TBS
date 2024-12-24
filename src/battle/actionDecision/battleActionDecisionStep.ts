import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/validityCheck"

export interface BattleActionDecisionStep {
    actor: BattleActionDecisionStepActor
    action: BattleActionDecisionStepAction
    target: BattleActionDecisionStepTarget
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

const isTargetConsidered = (actionBuilderState: BattleActionDecisionStep) =>
    isValidValue(actionBuilderState) && isValidValue(actionBuilderState.target)

const setConsideredTarget = (
    actionBuilderState: BattleActionDecisionStep,
    targetCoordinate: HexCoordinate
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    actionBuilderState.target = {
        targetCoordinate: targetCoordinate,
        confirmed: false,
    }
}

const isActorSet = (actionBuilderState: BattleActionDecisionStep) =>
    isValidValue(actionBuilderState) &&
    isValidValue(actionBuilderState.actor) &&
    isValidValue(actionBuilderState.actor.battleSquaddieId) &&
    actionBuilderState.actor.battleSquaddieId !== ""

const isTargetConfirmed = (actionBuilderState: BattleActionDecisionStep) =>
    isTargetConsidered(actionBuilderState) &&
    actionBuilderState.target.confirmed

const isActionSet = (actionBuilderState: BattleActionDecisionStep) =>
    isValidValue(actionBuilderState) &&
    isValidValue(actionBuilderState.action) &&
    (isValidValue(actionBuilderState.action.actionTemplateId) ||
        actionBuilderState.action.endTurn ||
        actionBuilderState.action.movement)

const setConfirmedTarget = (
    actionBuilderState: BattleActionDecisionStep,
    targetCoordinate: HexCoordinate
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    setConsideredTarget(actionBuilderState, targetCoordinate)
    actionBuilderState.target.confirmed = true
}

export const BattleActionDecisionStepService = {
    new: (): BattleActionDecisionStep => ({
        actor: undefined,
        action: undefined,
        target: undefined,
    }),
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
            isValidValue(actionBuilderState) &&
            isActorSet(actionBuilderState) &&
            isActionSet(actionBuilderState) &&
            isTargetConfirmed(actionBuilderState)
        )
    },
    isActorSet: (actionBuilderState: BattleActionDecisionStep): boolean => {
        return isActorSet(actionBuilderState)
    },
    isTargetConfirmed: (
        actionBuilderState: BattleActionDecisionStep
    ): boolean => {
        return isTargetConfirmed(actionBuilderState)
    },
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
    ): BattleActionDecisionStepActor => {
        return actionDecisionStep?.actor
    },
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
        const movementIsSet = movement === true || movement === false
        const endTurnIsSet = endTurn === true || endTurn === false

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
    ): BattleActionDecisionStepTarget => {
        return actionDecisionStep?.target
    },
    setConfirmedTarget: ({
        actionDecisionStep,
        targetCoordinate,
    }: {
        targetCoordinate: HexCoordinate
        actionDecisionStep: BattleActionDecisionStep
    }) => {
        setConfirmedTarget(actionDecisionStep, targetCoordinate)
    },
    getAction: (
        actionDecisionStep: BattleActionDecisionStep
    ): BattleActionDecisionStepAction => {
        return actionDecisionStep?.action
    },
    isTargetConsidered: (
        actionDecisionStep: BattleActionDecisionStep
    ): boolean => {
        return isTargetConsidered(actionDecisionStep)
    },
    isActionSet: (actionDecisionStep: BattleActionDecisionStep): boolean => {
        return isActionSet(actionDecisionStep)
    },
    confirmAlreadyConsideredTarget: ({
        actionDecisionStep,
    }: {
        actionDecisionStep: BattleActionDecisionStep
    }): boolean => {
        if (!isActionSet(actionDecisionStep)) {
            return false
        }
        if (isTargetConsidered(actionDecisionStep)) {
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
