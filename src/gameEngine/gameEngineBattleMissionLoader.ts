import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {GameEngineComponentState} from "./gameEngine";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {MissionLoader, MissionLoaderStatus} from "../battle/loading/missionLoader";
import {BattleOrchestratorState, BattleOrchestratorStateHelper} from "../battle/orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../battle/orchestrator/uiControlSettings";
import {GameModeEnum} from "../utils/startupConfig";
import {MissionObjective} from "../battle/missionResult/missionObjective";
import {MissionCondition} from "../battle/missionResult/missionCondition";
import {BattleSaveState, BattleSaveStateHandler} from "../battle/history/battleSaveState";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {TintSquaddieIfTurnIsComplete} from "../battle/animation/drawSquaddie";
import {getResultOrThrowError} from "../utils/ResultOrError";

export class GameEngineBattleMissionLoader implements GameEngineComponent {
    missionLoaderStatus: MissionLoaderStatus;
    appliedResources: boolean;
    backupBattleOrchestratorState: BattleOrchestratorState;
    loadedBattleSaveState: BattleSaveState;
    errorFoundWhileLoading: boolean;

    constructor() {
        this.resetInternalFields();
    }

    async update(state: GameEngineComponentState) {
        if (this.missionLoaderStatus.completionProgress.started !== true) {
            if ((state as BattleOrchestratorState).battleState.gameSaveFlags.loadRequested) {
                this.backupBattleOrchestratorState = (state as BattleOrchestratorState).clone();

                state = BattleOrchestratorStateHelper.newOrchestratorState({resourceHandler: (state as BattleOrchestratorState).resourceHandler});

                try {
                    this.loadedBattleSaveState = await SaveFile.RetrieveFileContent();
                } catch (e) {
                    (state as BattleOrchestratorState).battleState.gameSaveFlags.loadingInProgress = false;
                    (state as BattleOrchestratorState).battleState.gameSaveFlags.loadRequested = false;
                    this.errorFoundWhileLoading = true;
                    console.error("Failed to load progress file from storage.");
                    console.error(e);
                    return;
                }

                (state as BattleOrchestratorState).battleState.gameSaveFlags.loadingInProgress = true;
            }

            (state as BattleOrchestratorState).battleState.missionMap = NullMissionMap();
            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus: this.missionLoaderStatus,
                missionId: "0000",
                resourceHandler: (state as BattleOrchestratorState).resourceHandler,
            }).then(() => {
                MissionLoader.loadMissionFromHardcodedData({
                    missionLoaderStatus: this.missionLoaderStatus,
                    resourceHandler: (state as BattleOrchestratorState).resourceHandler,
                    squaddieRepository: (state as BattleOrchestratorState).squaddieRepository,
                });
            })
            return;
        }

        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus: this.missionLoaderStatus,
            resourceHandler: (state as BattleOrchestratorState).resourceHandler,
        });
        if (
            this.missionLoaderStatus.resourcesPendingLoading.length > 0
            || this.missionLoaderStatus.cutsceneInfo.cutsceneCollection === undefined
        ) {
            return;
        } else {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderStatus: this.missionLoaderStatus,
                resourceHandler: (state as BattleOrchestratorState).resourceHandler,
                squaddieRepository: (state as BattleOrchestratorState).squaddieRepository,
            });

            (state as BattleOrchestratorState).battleState.missionMap = this.missionLoaderStatus.missionMap;
            (state as BattleOrchestratorState).battleState.cutsceneCollection = this.missionLoaderStatus.cutsceneInfo.cutsceneCollection;
            (state as BattleOrchestratorState).battleState.cutsceneTriggers = [...this.missionLoaderStatus.cutsceneInfo.cutsceneTriggers];
            (state as BattleOrchestratorState).battleState.teamsByAffiliation = {...this.missionLoaderStatus.squaddieData.teamsByAffiliation};
            (state as BattleOrchestratorState).battleState.teamStrategyByAffiliation = {...this.missionLoaderStatus.squaddieData.teamStrategyByAffiliation};
            (state as BattleOrchestratorState).battleState.missionCompletionStatus = {};

            (state as BattleOrchestratorState).battleState.objectives = this.missionLoaderStatus.objectives;
            (state as BattleOrchestratorState).battleState.objectives.forEach((objective: MissionObjective) => {
                const conditions: {
                    [mission_condition_id: string]: boolean;
                } = {}
                objective.conditions.forEach((condition: MissionCondition) => {
                    conditions[condition.id] = undefined;
                });

                (state as BattleOrchestratorState).battleState.missionCompletionStatus[objective.id] = {
                    isComplete: undefined,
                    conditions,
                };
            });

            if ((state as BattleOrchestratorState).battleState.gameSaveFlags.loadRequested) {
                BattleSaveStateHandler.applySaveStateToOrchestratorState({
                    battleSaveState: this.loadedBattleSaveState,
                    battleOrchestratorState: (state as BattleOrchestratorState),
                    squaddieRepository: (state as BattleOrchestratorState).squaddieRepository,
                });

                if ((state as BattleOrchestratorState).isValid) {
                    this.backupBattleOrchestratorState = undefined;
                    this.addMidTurnEffects((state as BattleOrchestratorState));
                } else {
                    console.error("Save file is incompatible. Reverting.");
                    (state as BattleOrchestratorState).copyOtherOrchestratorState(this.backupBattleOrchestratorState);
                    this.errorFoundWhileLoading = true;
                }
                (state as BattleOrchestratorState).battleState.gameSaveFlags.loadRequested = false;
            }
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
        if (this.errorFoundWhileLoading) {
            return true;
        }

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
        this.resetInternalFields();
    }

    keyPressed(state: GameEngineComponentState, keyCode: number): void {
    }

    mouseClicked(state: GameEngineComponentState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
    }

    mouseMoved(state: GameEngineComponentState, mouseX: number, mouseY: number): void {
    }

    private resetInternalFields() {
        this.missionLoaderStatus = MissionLoader.newEmptyMissionLoaderStatus();
        this.appliedResources = false;
        this.backupBattleOrchestratorState = undefined;
        this.loadedBattleSaveState = undefined;
        this.errorFoundWhileLoading = false;
    }

    private addMidTurnEffects(battleOrchestratorState: BattleOrchestratorState) {
        battleOrchestratorState.squaddieRepository.getBattleSquaddieIterator().forEach((info) => {
            const {battleSquaddie, battleSquaddieId} = info;
            const {squaddieTemplate} = getResultOrThrowError(
                battleOrchestratorState.squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

            TintSquaddieIfTurnIsComplete(
                battleOrchestratorState.squaddieRepository,
                battleSquaddie,
                squaddieTemplate,
            );
        });
    }
}
