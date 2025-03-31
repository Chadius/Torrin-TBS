import { StateMachineUpdate } from "./stateMachineUpdate"
import {
    StateMachineData,
    StateMachineDataService,
} from "./stateMachineData/stateMachineData"

export class StateMachine<
    StateType extends string,
    TransitionType extends string,
    ActionType extends string,
    WorldType,
> {
    id: string
    initialState: StateType
    currentState: StateType
    stateMachineData: StateMachineData<
        StateType,
        TransitionType,
        ActionType,
        WorldType
    >
    worldData: WorldType

    constructor({
        id,
        stateMachineData,
        worldData,
    }: {
        id: string
        stateMachineData: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >
        worldData: WorldType
    }) {
        this.id = id
        this.initialState = stateMachineData.initialState
        this.worldData = worldData
        this.currentState = this.initialState
    }

    update(): StateMachineUpdate<StateType, TransitionType, ActionType> {
        const triggeredTransition = this.getTriggeredTransition()
        if (!triggeredTransition) {
            return {
                stateMachineId: this.id,
                transitionFired: undefined,
                actions: this.getActionsFromCurrentState(),
                targetedState: undefined,
            }
        }

        const { targetedState, stateMachineId } =
            this.getTargetedStateFromTransition(triggeredTransition)
        const actions: ActionType[] = [
            this.getExitActionFromCurrentState(),
            this.getActionFromTriggeredTransition(triggeredTransition),
            this.getEntryActionFromTargetState(targetedState),
        ].filter((x) => x)
        return {
            stateMachineId,
            transitionFired: triggeredTransition,
            actions,
            targetedState,
        }
    }

    getTriggeredTransition(): TransitionType {
        return this.getTransitionsForCurrentState().find((transition) =>
            StateMachineDataService.isTransitionTriggered({
                stateMachineData: this.stateMachineData,
                transition: transition,
                worldData: this.worldData,
            })
        )
    }

    getTransitionsForCurrentState(): TransitionType[] {
        return StateMachineDataService.getTransitionsForState(
            this.stateMachineData,
            this.currentState
        )
    }

    getActionsFromCurrentState(): ActionType[] {
        return StateMachineDataService.getActionsFromState(
            this.stateMachineData,
            this.currentState
        )
    }

    getTargetedStateFromTransition(transition: TransitionType): {
        targetedState: StateType
        stateMachineId: string
    } {
        const targetedState =
            StateMachineDataService.getTargetedStateFromTransition(
                this.stateMachineData,
                transition
            )
        return {
            targetedState,
            stateMachineId: targetedState ? this.id : undefined,
        }
    }

    getExitActionFromCurrentState(): ActionType {
        return this.getExitActionFromState(this.currentState)
    }

    getExitActionFromState(stateMachineState: StateType): ActionType {
        return StateMachineDataService.getExitActionFromState(
            this.stateMachineData,
            stateMachineState
        )
    }

    getActionFromTriggeredTransition(
        triggeredTransition: TransitionType
    ): ActionType {
        return StateMachineDataService.getActionFromTriggeredTransition(
            this.stateMachineData,
            triggeredTransition
        )
    }

    getEntryActionFromTargetState(targetState: StateType): ActionType {
        return StateMachineDataService.getEntryActionFromState(
            this.stateMachineData,
            targetState
        )
    }
}
