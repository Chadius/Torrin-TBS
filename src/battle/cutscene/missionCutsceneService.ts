import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionStartOfPhaseCutsceneTrigger} from "./missionStartOfPhaseCutsceneTrigger";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";


function getMissionObjectivesByRewardType(completedObjectives: MissionObjective[], rewardType: MissionRewardType) {
    return completedObjectives.find((objective: MissionObjective) => objective.reward.rewardType === rewardType);
}

function findMissionObjectiveCutscenes(defeatObjective: MissionObjective, state: BattleOrchestratorState, victoryObjective: MissionObjective) {
    let cutsceneId: string = "";
    let cutsceneTrigger: CutsceneTrigger = undefined;
    if (defeatObjective) {
        cutsceneTrigger = state.cutsceneTriggers.find((trigger) => trigger.triggeringEvent === TriggeringEvent.MISSION_DEFEAT);
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger);
    } else if (victoryObjective) {
        cutsceneTrigger = state.cutsceneTriggers.find((trigger) => trigger.triggeringEvent === TriggeringEvent.MISSION_VICTORY);
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger);
    }
    return {cutsceneId, cutsceneTrigger};
}

function addStartOfTurnTriggers(turnObjectives: CutsceneTrigger[], state: BattleOrchestratorState, cutscenesToPlay: string[], cutsceneTriggersToReactTo: CutsceneTrigger[]) {
    const turnTriggersToReactTo = turnObjectives.filter((trigger) => {
        const startOfTurnTrigger = trigger as MissionStartOfPhaseCutsceneTrigger;
        if (state.battlePhaseState.turnCount !== startOfTurnTrigger.phase) {
            return false;
        }
        return isTriggerReadyToReact(trigger);
    });
    const turnObjectivesCutsceneIdsToReactTo = turnTriggersToReactTo.map((trigger) => trigger.cutsceneId);
    cutscenesToPlay.push(...turnObjectivesCutsceneIdsToReactTo);
    cutsceneTriggersToReactTo.push(...turnTriggersToReactTo);
}


export const GetCutsceneTriggersToActivate = (
    state: BattleOrchestratorState,
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
) => {
    const squaddieActionCompleteModes = [
        BattleOrchestratorMode.SQUADDIE_MOVER,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
    ];

    const startOfPhaseModes = [
        BattleOrchestratorMode.LOADING_MISSION,
        BattleOrchestratorMode.PHASE_CONTROLLER,
    ];

    const cutscenesToPlay: string[] = [];
    const cutsceneTriggersToReactTo: CutsceneTrigger[] = [];

    let cutsceneId: string = "";
    let cutsceneTrigger: CutsceneTrigger = undefined;

    if (squaddieActionCompleteModes.includes(battleOrchestratorModeThatJustCompleted)) {
        const completedObjectives = state.objectives.filter((objective: MissionObjective) =>
            objective.shouldBeComplete(state) && !objective.hasGivenReward
        );

        const victoryObjective = getMissionObjectivesByRewardType(completedObjectives, MissionRewardType.VICTORY);
        const defeatObjective = getMissionObjectivesByRewardType(completedObjectives, MissionRewardType.DEFEAT);

        ({cutsceneId, cutsceneTrigger} = findMissionObjectiveCutscenes(defeatObjective, state, victoryObjective));
    }

    if (cutsceneId !== "" && cutsceneTrigger) {
        cutscenesToPlay.push(cutsceneId);
        cutsceneTriggersToReactTo.push(cutsceneTrigger);

        return {
            cutscenesToPlay,
            cutsceneTriggersToReactTo,
        }
    }

    if (startOfPhaseModes.includes(battleOrchestratorModeThatJustCompleted)) {
        const turnObjectives = state.cutsceneTriggers.filter((trigger) => trigger.triggeringEvent === TriggeringEvent.START_OF_TURN);
        addStartOfTurnTriggers(turnObjectives, state, cutscenesToPlay, cutsceneTriggersToReactTo);
    }

    return {
        cutscenesToPlay,
        cutsceneTriggersToReactTo,
    }
}

function isTriggerReadyToReact(cutsceneTrigger: CutsceneTrigger) {
    if (cutsceneTrigger === undefined) {
        return false;
    }

    return !cutsceneTrigger.systemReactedToTrigger;
}

function getCutsceneIdIfTriggerIsValid(cutsceneTrigger: CutsceneTrigger) {
    if (!isTriggerReadyToReact(cutsceneTrigger)) {
        return "";
    }

    return cutsceneTrigger.cutsceneId;
}