export interface StateMachineStateData<TransitionType, ActionType> {
    transitions: TransitionType[]
    entryAction: ActionType
    actions: ActionType[]
    exitAction: ActionType
}
