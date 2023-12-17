import {GameEngineState} from "./gameEngine";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {MissionLoader, MissionLoaderContext} from "../battle/loading/missionLoader";
import {BattleOrchestratorState, BattleOrchestratorStateHelper} from "../battle/orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../battle/orchestrator/uiControlSettings";
import {GameModeEnum} from "../utils/startupConfig";
import {MissionObjective} from "../battle/missionResult/missionObjective";
import {MissionCondition} from "../battle/missionResult/missionCondition";
import {BattleSaveState, BattleSaveStateHandler} from "../battle/history/battleSaveState";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {TintSquaddieIfTurnIsComplete} from "../battle/animation/drawSquaddie";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {BattleCompletionStatus} from "../battle/orchestrator/missionObjectivesAndCutscenes";
import {BattleCameraHelper} from "../battle/battleCamera";

export class GameEngineBattleMissionLoader implements GameEngineComponent {
    missionLoaderStatus: MissionLoaderContext;
    appliedResources: boolean;
    backupBattleOrchestratorState: BattleOrchestratorState;
    loadedBattleSaveState: BattleSaveState;
    errorFoundWhileLoading: boolean;

    constructor() {
        this.resetInternalFields();
    }

    async update(state: GameEngineState) {
        if (this.missionLoaderStatus.completionProgress.started !== true) {
            this.backupBattleOrchestratorState = state.battleOrchestratorState.clone();

            try {
                await this.loadBattleSaveStateFromFile(state);
            } catch {
                return;
            }

            this.resetBattleOrchestratorState(state.battleOrchestratorState);
            await this.loadMissionDataFromFile(state.battleOrchestratorState);
            return;
        }

        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus: this.missionLoaderStatus,
            resourceHandler: state.battleOrchestratorState.resourceHandler,
        });
        if (
            this.missionLoaderStatus.resourcesPendingLoading.length > 0
            || this.missionLoaderStatus.cutsceneInfo.cutsceneCollection === undefined
        ) {
            return;
        } else {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderStatus: this.missionLoaderStatus,
                resourceHandler: state.battleOrchestratorState.resourceHandler,
                squaddieRepository: state.battleOrchestratorState.squaddieRepository,
            });
            this.applyMissionLoaderStatusToBattleOrchestratorState(state.battleOrchestratorState);
            this.applySaveStateToBattleOrchestratorState(state);
            this.appliedResources = true;
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: false,
            pauseTimer: false,
        });
    }

    hasCompleted(state: GameEngineState): boolean {
        if (this.errorFoundWhileLoading) {
            return true;
        }

        return this.missionLoaderStatus.completionProgress.started
            && this.missionLoaderStatus.completionProgress.loadedFileData
            && this.appliedResources;
    }

    recommendStateChanges(state: GameEngineState): GameEngineChanges | undefined {
        if (this.errorFoundWhileLoading) {
            return {
                nextMode: state.modeThatInitiatedLoading !== GameModeEnum.UNKNOWN ? state.modeThatInitiatedLoading : GameModeEnum.TITLE_SCREEN,
            }
        }
        return {
            nextMode: GameModeEnum.BATTLE,
        }
    }

    reset(state: GameEngineState) {
        this.resetInternalFields();
    }

    keyPressed(state: GameEngineState, keyCode: number): void {
    }

    mouseClicked(state: GameEngineState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
    }

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void {
    }

    private applySaveStateToBattleOrchestratorState(gameEngineState: GameEngineState) {
        let battleOrchestratorState = gameEngineState.battleOrchestratorState;
        if (gameEngineState.gameSaveFlags.loadRequested) {
            BattleSaveStateHandler.applySaveStateToOrchestratorState({
                battleSaveState: this.loadedBattleSaveState,
                battleOrchestratorState: battleOrchestratorState,
                squaddieRepository: battleOrchestratorState.squaddieRepository,
            });

            if (battleOrchestratorState.isValid) {
                this.backupBattleOrchestratorState = undefined;
                this.addMidTurnEffects(battleOrchestratorState);
            } else {
                console.error("Save file is incompatible. Reverting.");
                battleOrchestratorState.copyOtherOrchestratorState(this.backupBattleOrchestratorState);
                this.errorFoundWhileLoading = true;
            }
            gameEngineState.gameSaveFlags.loadingInProgress = false;
            gameEngineState.gameSaveFlags.loadRequested = false;
        }
    }

    private applyMissionLoaderStatusToBattleOrchestratorState(battleOrchestratorState: BattleOrchestratorState) {
        battleOrchestratorState.battleState.missionId = this.missionLoaderStatus.id;
        battleOrchestratorState.battleState.missionMap = this.missionLoaderStatus.missionMap;
        battleOrchestratorState.battleState.cutsceneCollection = this.missionLoaderStatus.cutsceneInfo.cutsceneCollection;
        battleOrchestratorState.battleState.cutsceneTriggers = [...this.missionLoaderStatus.cutsceneInfo.cutsceneTriggers];
        battleOrchestratorState.battleState.teams = [...this.missionLoaderStatus.squaddieData.teams];

        battleOrchestratorState.battleState.teamStrategiesById = Object.fromEntries(
            this.missionLoaderStatus.squaddieData.teams.map(team =>
                [
                    team.id,
                    this.missionLoaderStatus.squaddieData.teamStrategyById[team.id] ? [
                            ...this.missionLoaderStatus.squaddieData.teamStrategyById[team.id]
                        ]
                        : []
                ]
            )
        );

        battleOrchestratorState.battleState.battleCompletionStatus = BattleCompletionStatus.IN_PROGRESS;
        battleOrchestratorState.battleState.camera = BattleCameraHelper.clone({original: this.missionLoaderStatus.mapSettings.camera});

        battleOrchestratorState.battleState.missionCompletionStatus = {};
        battleOrchestratorState.battleState.objectives = this.missionLoaderStatus.objectives;
        battleOrchestratorState.battleState.objectives.forEach((objective: MissionObjective) => {
            const conditions: {
                [missionConditionId: string]: boolean;
            } = {}
            objective.conditions.forEach((condition: MissionCondition) => {
                conditions[condition.id] = undefined;
            });

            battleOrchestratorState.battleState.missionCompletionStatus[objective.id] = {
                isComplete: undefined,
                conditions,
            };
        });
    }

    private async loadMissionDataFromFile(battleOrchestratorState: BattleOrchestratorState) {
        await MissionLoader.loadMissionFromFile({
            missionLoaderContext: this.missionLoaderStatus,
            missionId: "0000",
            resourceHandler: battleOrchestratorState.resourceHandler,
            squaddieRepository: battleOrchestratorState.squaddieRepository,
        }).then(() => {
            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderStatus: this.missionLoaderStatus,
                resourceHandler: battleOrchestratorState.resourceHandler,
                squaddieRepository: battleOrchestratorState.squaddieRepository,
            });
        });
    }

    private resetBattleOrchestratorState(state: BattleOrchestratorState) {
        state.copyOtherOrchestratorState(
            BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler: (state as BattleOrchestratorState).resourceHandler,
            })
        );
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

    private async loadBattleSaveStateFromFile(gameEngineState: GameEngineState): Promise<Error> {
        if (!gameEngineState.gameSaveFlags.loadRequested) {
            return;
        }

        try {
            this.loadedBattleSaveState = await SaveFile.RetrieveFileContent();
        } catch (e) {
            gameEngineState.gameSaveFlags.loadingInProgress = false;
            gameEngineState.gameSaveFlags.loadRequested = false;
            this.errorFoundWhileLoading = true;
            console.error("Failed to load progress file from storage.");
            console.error(e);
            return e;
        }

        return undefined;
    }
}
