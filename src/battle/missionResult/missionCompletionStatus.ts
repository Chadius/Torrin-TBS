export interface MissionCompletionStatus {
    [mission_objective_id: string]: {
        isComplete: boolean;
        conditions: {
            [mission_condition_id: string]: boolean;
        }
    }
}
