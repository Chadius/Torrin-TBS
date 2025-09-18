export interface MissionCompletionStatus {
    [missionObjectiveId: string]: {
        isComplete: boolean | undefined
        conditions: {
            [missionConditionId: string]: boolean | undefined
        }
    }
}
