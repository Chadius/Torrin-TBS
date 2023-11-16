import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {GameEngineComponentState} from "./gameEngine";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {MissionLoader, MissionLoaderStatus} from "../battle/loading/missionLoader";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../battle/orchestrator/uiControlSettings";
import {GameModeEnum} from "../utils/startupConfig";
import {MissionObjective} from "../battle/missionResult/missionObjective";
import {MissionCondition} from "../battle/missionResult/missionCondition";

export class GameEngineBattleMissionLoader implements GameEngineComponent {
    missionLoaderStatus: MissionLoaderStatus;
    appliedResources: boolean;

    constructor() {
        this.missionLoaderStatus = MissionLoader.newEmptyMissionLoaderStatus();
        this.appliedResources = false;
    }

    update(state: GameEngineComponentState) {
        if (this.missionLoaderStatus.completionProgress.started !== true) {
            (state as BattleOrchestratorState).missionMap = NullMissionMap();
            MissionLoader.loadMissionFromFile({
                missionLoaderStatus: this.missionLoaderStatus,
                missionId: "0000",
                resourceHandler: (state as BattleOrchestratorState).resourceHandler,
            }).then(() => {
                MissionLoader.loadMissionFromHardcodedData({
                    missionLoaderStatus: this.missionLoaderStatus,
                    resourceHandler: (state as BattleOrchestratorState).resourceHandler,
                    squaddieRepository: (state as BattleOrchestratorState).squaddieRepository,
                });
            });
            return;
        }

        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus: this.missionLoaderStatus,
            resourceHandler: (state as BattleOrchestratorState).resourceHandler,
        });
        if (this.missionLoaderStatus.resourcesPendingLoading.length > 0) {
            return;
        } else {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderStatus: this.missionLoaderStatus,
                resourceHandler: (state as BattleOrchestratorState).resourceHandler,
                squaddieRepository: (state as BattleOrchestratorState).squaddieRepository,
            });

            (state as BattleOrchestratorState).missionMap = this.missionLoaderStatus.missionMap;
            (state as BattleOrchestratorState).gameBoard.cutsceneCollection = this.missionLoaderStatus.cutsceneInfo.cutsceneCollection;
            (state as BattleOrchestratorState).gameBoard.cutsceneTriggers = this.missionLoaderStatus.cutsceneInfo.cutsceneTriggers;
            (state as BattleOrchestratorState).teamsByAffiliation = this.missionLoaderStatus.squaddieData.teamsByAffiliation;
            (state as BattleOrchestratorState).teamStrategyByAffiliation = this.missionLoaderStatus.squaddieData.teamStrategyByAffiliation;
            (state as BattleOrchestratorState).missionCompletionStatus = {};

            (state as BattleOrchestratorState).gameBoard.objectives = this.missionLoaderStatus.objectives;
            (state as BattleOrchestratorState).gameBoard.objectives.forEach((objective: MissionObjective) => {
                const conditions: {
                    [mission_condition_id: string]: boolean;
                } = {}
                objective.conditions.forEach((condition: MissionCondition) => {
                    conditions[condition.id] = undefined;
                });

                (state as BattleOrchestratorState).missionCompletionStatus[objective.id] = {
                    isComplete: undefined,
                    conditions,
                };
            });

            this.appliedResources = true;
        }
    }

    uiControlSettings(state: GameEngineComponentState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: false,
            pauseTimer: false,
        });
    }

    hasCompleted(state: GameEngineComponentState): boolean {
        return this.missionLoaderStatus.completionProgress.started
            && this.missionLoaderStatus.completionProgress.loadedFileData
            && this.appliedResources;
    }

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.BATTLE,
        }
    }

    reset(state: GameEngineComponentState) {
        this.missionLoaderStatus = MissionLoader.newEmptyMissionLoaderStatus();
        this.appliedResources = false;
    }

    keyPressed(state: GameEngineComponentState, keyCode: number): void {
    }

    mouseClicked(state: GameEngineComponentState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
    }

    mouseMoved(state: GameEngineComponentState, mouseX: number, mouseY: number): void {
    }
}
