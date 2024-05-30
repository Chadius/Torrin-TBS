export interface MissionCompletionStatus {
    [missionObjectiveId: string]: {
        isComplete: boolean
        conditions: {
            [missionConditionId: string]: boolean
        }
    }
}
