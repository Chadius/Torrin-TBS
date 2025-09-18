export interface StateMachineStateData<TransitionType, ActionType> {
    transitions: TransitionType[]
    entryAction: ActionType | undefined
    actions: ActionType[]
    exitAction: ActionType | undefined
}
