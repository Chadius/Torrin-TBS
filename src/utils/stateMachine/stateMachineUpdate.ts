export interface StateMachineUpdate<StateType, TransitionType, ActionType> {
    stateMachineId: string | undefined
    transitionFired: TransitionType | undefined
    actions: ActionType[]
    targetedState: StateType | undefined
}
