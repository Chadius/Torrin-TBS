export interface StateMachineTransitionData<StateType, ActionType> {
    targetedState: StateType
    action: ActionType
}
