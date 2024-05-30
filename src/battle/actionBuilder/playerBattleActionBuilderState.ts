import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/validityCheck"
import { ActionTemplate } from "../../action/template/actionTemplate"

export interface PlayerBattleActionBuilderState {
    actor: ActionBuilderStateActor
    action: ActionBuilderStateAction
    target: ActionBuilderStateTarget
    animation: ActionBuilderStateAnimation
}

export interface ActionBuilderStateActor {
    battleSquaddieId: string
}

export interface ActionBuilderStateAction {
    actionTemplate?: ActionTemplate
    movement?: boolean
    endTurn?: boolean
}

export interface ActionBuilderStateTarget {
    targetLocation?: HexCoordinate
    confirmed: boolean
}

export interface ActionBuilderStateAnimation {
    completed: boolean
}

const isTargetConsidered = (
    actionBuilderState: PlayerBattleActionBuilderState
) => isValidValue(actionBuilderState) && isValidValue(actionBuilderState.target)

const setConsideredTarget = (
    actionBuilderState: PlayerBattleActionBuilderState,
    targetLocation: HexCoordinate
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    actionBuilderState.target = {
        targetLocation,
        confirmed: false,
    }
}

const isActorSet = (actionBuilderState: PlayerBattleActionBuilderState) =>
    isValidValue(actionBuilderState) &&
    isValidValue(actionBuilderState.actor) &&
    isValidValue(actionBuilderState.actor.battleSquaddieId) &&
    actionBuilderState.actor.battleSquaddieId !== ""

const isAnimationComplete = (
    actionBuilderState: PlayerBattleActionBuilderState
) =>
    isValidValue(actionBuilderState) &&
    isValidValue(actionBuilderState.animation) &&
    actionBuilderState.animation.completed

const isTargetConfirmed = (
    actionBuilderState: PlayerBattleActionBuilderState
) =>
    isTargetConsidered(actionBuilderState) &&
    actionBuilderState.target.confirmed

const isActionSet = (actionBuilderState: PlayerBattleActionBuilderState) =>
    isValidValue(actionBuilderState) &&
    isValidValue(actionBuilderState.action) &&
    (isValidValue(actionBuilderState.action.actionTemplate) ||
        actionBuilderState.action.endTurn ||
        actionBuilderState.action.movement)

const setConfirmedTarget = (
    actionBuilderState: PlayerBattleActionBuilderState,
    targetLocation: HexCoordinate
) => {
    if (!isValidValue(actionBuilderState)) {
        return
    }

    setConsideredTarget(actionBuilderState, targetLocation)
    actionBuilderState.target.confirmed = true
}

export const PlayerBattleActionBuilderStateService = {
    new: ({}: {}): PlayerBattleActionBuilderState => {
        return {
            actor: undefined,
            action: undefined,
            target: undefined,
            animation: undefined,
        }
    },
    isActionBuilderStateNotSet: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return (
            !isValidValue(actionBuilderState) ||
            (!isActorSet(actionBuilderState) &&
                !isActionSet(actionBuilderState) &&
                !isTargetConfirmed(actionBuilderState) &&
                !isAnimationComplete(actionBuilderState))
        )
    },
    isActionComplete: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return (
            isValidValue(actionBuilderState) &&
            isActorSet(actionBuilderState) &&
            isActionSet(actionBuilderState) &&
            isTargetConfirmed(actionBuilderState) &&
            isAnimationComplete(actionBuilderState)
        )
    },
    isActorSet: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return isActorSet(actionBuilderState)
    },
    isTargetConfirmed: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return isTargetConfirmed(actionBuilderState)
    },
    isAnimationComplete: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return isAnimationComplete(actionBuilderState)
    },
    setActor: ({
        actionBuilderState,
        battleSquaddieId,
    }: {
        actionBuilderState: PlayerBattleActionBuilderState
        battleSquaddieId: string
    }) => {
        if (!isValidValue(actionBuilderState)) {
            return
        }
        actionBuilderState.actor = {
            battleSquaddieId,
        }
    },
    getActor: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): ActionBuilderStateActor => {
        return actionBuilderState?.actor
    },
    addAction: ({
        actionBuilderState,
        actionTemplate,
        movement,
        endTurn,
    }: {
        actionBuilderState: PlayerBattleActionBuilderState
        actionTemplate?: ActionTemplate
        movement?: boolean
        endTurn?: boolean
    }) => {
        if (!isValidValue(actionBuilderState)) {
            return
        }
        const actionTemplateIsSet = isValidValue(actionTemplate)
        const movementIsSet = movement === true || movement === false
        const endTurnIsSet = endTurn === true || endTurn === false

        if (!(actionTemplateIsSet || movementIsSet || endTurnIsSet)) {
            throw new Error(
                "setAction: missing actionTemplate, movement or end turn"
            )
        }

        actionBuilderState.action = {
            actionTemplate,
            movement,
            endTurn,
        }

        if (endTurn) {
            setConfirmedTarget(actionBuilderState, undefined)
        }
    },
    setConsideredTarget: ({
        actionBuilderState,
        targetLocation,
    }: {
        targetLocation: HexCoordinate
        actionBuilderState: PlayerBattleActionBuilderState
    }) => {
        setConsideredTarget(actionBuilderState, targetLocation)
    },
    getTarget: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): ActionBuilderStateTarget => {
        return actionBuilderState?.target
    },
    setConfirmedTarget: ({
        actionBuilderState,
        targetLocation,
    }: {
        targetLocation: HexCoordinate
        actionBuilderState: PlayerBattleActionBuilderState
    }) => {
        setConfirmedTarget(actionBuilderState, targetLocation)
    },
    getAction: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): ActionBuilderStateAction => {
        return actionBuilderState?.action
    },
    setAnimationCompleted: ({
        actionBuilderState,
        animationCompleted,
    }: {
        animationCompleted: boolean
        actionBuilderState: PlayerBattleActionBuilderState
    }) => {
        if (!isValidValue(actionBuilderState)) {
            return
        }
        actionBuilderState.animation = {
            completed: animationCompleted,
        }
    },
    isTargetConsidered: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return isTargetConsidered(actionBuilderState)
    },
    isActionSet: (
        actionBuilderState: PlayerBattleActionBuilderState
    ): boolean => {
        return isActionSet(actionBuilderState)
    },
    confirmAlreadyConsideredTarget: ({
        actionBuilderState,
    }: {
        actionBuilderState: PlayerBattleActionBuilderState
    }): boolean => {
        if (!isActionSet(actionBuilderState)) {
            return false
        }
        if (isTargetConsidered(actionBuilderState)) {
            actionBuilderState.target.confirmed = true
            return true
        }
        return false
    },
    removeAction: ({
        actionBuilderState,
    }: {
        actionBuilderState: PlayerBattleActionBuilderState
    }) => {
        if (!isValidValue(actionBuilderState)) {
            return
        }
        actionBuilderState.action = undefined
    },
}
