import {MissionReward} from "./missionReward";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionCondition, MissionShouldBeComplete} from "./missionCondition";
import {MissionCompletionStatus} from "./missionCompletionStatus";

export interface MissionObjective {
    reward: MissionReward;
    conditions: MissionCondition[],
    numberOfRequiredConditionsToComplete: number | "all" | "ALL",
    id: string,
    hasGivenReward: boolean,
}

export const MissionObjectiveHelper = {
    validateMissionObjective: (objective: MissionObjective): MissionObjective => {
        if (Number.isInteger(objective.numberOfRequiredConditionsToComplete)) {
            objective.numberOfRequiredConditionsToComplete = Number(objective.numberOfRequiredConditionsToComplete);
        } else {
            objective.numberOfRequiredConditionsToComplete = objective.conditions.length;
        }

        if (objective.numberOfRequiredConditionsToComplete > objective.conditions.length) {
            objective.numberOfRequiredConditionsToComplete = objective.conditions.length;
        }
        return objective;
    },
    allConditionsAreRequiredToCompleteObjective: (objective: MissionObjective): boolean => {
        return objective.numberOfRequiredConditionsToComplete === objective.conditions.length;
    },
    shouldBeComplete: (objective: MissionObjective, state: BattleOrchestratorState): boolean => {
        const missionCompletionStatus: MissionCompletionStatus = state.missionCompletionStatus;

        if (missionCompletionStatus[objective.id].isComplete !== undefined) {
            return missionCompletionStatus[objective.id].isComplete;
        }
        const completeConditions = objective.conditions.filter((condition: MissionCondition) => {
            return MissionShouldBeComplete(condition, state, objective.id);
        });
        return completeConditions.length >= objective.numberOfRequiredConditionsToComplete;
    }
}

