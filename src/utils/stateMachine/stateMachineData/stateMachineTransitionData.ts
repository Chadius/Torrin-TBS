export interface StateMachineTransitionData<StateType, ActionType> {
    targetedState: StateType | undefined
    action: ActionType | undefined
}
