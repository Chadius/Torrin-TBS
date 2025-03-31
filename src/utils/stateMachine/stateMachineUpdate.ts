export interface StateMachineUpdate<StateType, TransitionType, ActionType> {
    stateMachineId: string
    transitionFired: TransitionType
    actions: ActionType[]
    targetedState: StateType
}
