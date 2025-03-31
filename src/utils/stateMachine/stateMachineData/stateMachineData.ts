import { StateMachineTransitionData } from "./stateMachineTransitionData"
import { StateMachineTransitionTriggerLogic } from "./stateMachineTransitionTriggerLogic"
import { StateMachineStateData } from "./stateMachineStateData"

export interface StateMachineData<
    StateType extends string,
    TransitionType extends string,
    ActionType extends string,
    WorldType,
> {
    initialState: StateType
    infoByTransition: {
        [t in TransitionType]?: StateMachineTransitionData<
            StateType,
            ActionType
        >
    }
    infoByState: {
        [s in StateType]?: StateMachineStateData<TransitionType, ActionType>
    }
    isTriggerByTransition: {
        [t in TransitionType]?: StateMachineTransitionTriggerLogic<WorldType>
    }
}

export const StateMachineDataService = {
    new: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >({
        initialState,
        infoByState,
        infoByTransition,
    }: {
        initialState: StateType
        infoByState?: {
            [s in StateType]?: StateMachineStateData<TransitionType, ActionType>
        }
        infoByTransition: {
            [t in TransitionType]?: StateMachineTransitionData<
                StateType,
                ActionType
            >
        }
    }): StateMachineData<StateType, TransitionType, ActionType, WorldType> => {
        const isTriggerByTransition: {
            [t in TransitionType]?: StateMachineTransitionTriggerLogic<WorldType>
        } = {}
        Object.keys(infoByTransition ?? {}).forEach((key) => {
            isTriggerByTransition[key as TransitionType] = (_: WorldType) =>
                false
        })

        return {
            initialState,
            infoByTransition: infoByTransition ?? {},
            infoByState: infoByState ?? {},
            isTriggerByTransition,
        }
    },
    isTransitionTriggered: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >({
        stateMachineData,
        transition,
        worldData,
    }: {
        stateMachineData: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >
        transition: TransitionType
        worldData: WorldType
    }): boolean =>
        stateMachineData.isTriggerByTransition[transition]
            ? stateMachineData.isTriggerByTransition[transition](worldData)
            : false,
    setTransitionTriggerFunctions: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        triggerFunctionsByTransitionType: {
            [t in TransitionType]?: StateMachineTransitionTriggerLogic<WorldType>
        }
    ) => {
        Object.assign(
            data.isTriggerByTransition,
            triggerFunctionsByTransitionType
        )
        const guv = 2
        return guv + 1
    },
    getTransitionsForState: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        stateType: StateType
    ): TransitionType[] => data.infoByState[stateType]?.transitions ?? [],
    getActionsFromState: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        stateType: StateType
    ): ActionType[] => data.infoByState[stateType]?.actions ?? [],
    getTargetedStateFromTransition: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        transition: TransitionType
    ): StateType => {
        return data.infoByTransition[transition]?.targetedState
    },
    getEntryActionFromState: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        stateType: StateType
    ): ActionType => {
        return data.infoByState[stateType]?.entryAction
    },
    getExitActionFromState: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        stateType: StateType
    ): ActionType => {
        return data.infoByState[stateType]?.exitAction
    },
    getActionFromTriggeredTransition: <
        StateType extends string,
        TransitionType extends string,
        ActionType extends string,
        WorldType,
    >(
        data: StateMachineData<
            StateType,
            TransitionType,
            ActionType,
            WorldType
        >,
        triggeredTransition: TransitionType
    ): ActionType => {
        return data.infoByTransition[triggeredTransition]?.action
    },
}
