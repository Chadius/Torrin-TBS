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
import {ObjectRepositoryHelper} from "../battle/objectRepository";

export class GameEngineBattleMissionLoader implements GameEngineComponent {
    missionLoaderContext: MissionLoaderContext;
    appliedResources: boolean;
    backupBattleOrchestratorState: BattleOrchestratorState;
    loadedBattleSaveState: BattleSaveState;
    errorFoundWhileLoading: boolean;

    constructor() {
        this.resetInternalFields();
    }

    async update(state: GameEngineState) {
        if (this.missionLoaderContext.completionProgress.started !== true) {
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
            missionLoaderContext: this.missionLoaderContext,
            resourceHandler: state.battleOrchestratorState.resourceHandler,
        });
        if (
            this.missionLoaderContext.resourcesPendingLoading.length > 0
            || this.missionLoaderContext.cutsceneInfo.cutsceneCollection === undefined
        ) {
            return;
        } else {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext: this.missionLoaderContext,
                resourceHandler: state.battleOrchestratorState.resourceHandler,
                squaddieRepository: state.battleOrchestratorState.squaddieRepository,
            });
            this.applyMissionLoaderContextToBattleOrchestratorState(state.battleOrchestratorState);
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

        return this.missionLoaderContext.completionProgress.started
            && this.missionLoaderContext.completionProgress.loadedFileData
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

    private applyMissionLoaderContextToBattleOrchestratorState(battleOrchestratorState: BattleOrchestratorState) {
        battleOrchestratorState.battleState.missionId = this.missionLoaderContext.id;
        battleOrchestratorState.battleState.missionMap = this.missionLoaderContext.missionMap;
        battleOrchestratorState.battleState.cutsceneCollection = this.missionLoaderContext.cutsceneInfo.cutsceneCollection;
        battleOrchestratorState.battleState.cutsceneTriggers = [...this.missionLoaderContext.cutsceneInfo.cutsceneTriggers];
        battleOrchestratorState.battleState.teams = [...this.missionLoaderContext.squaddieData.teams];

        battleOrchestratorState.battleState.teamStrategiesById = Object.fromEntries(
            this.missionLoaderContext.squaddieData.teams.map(team =>
                [
                    team.id,
                    this.missionLoaderContext.squaddieData.teamStrategyById[team.id] ? [
                            ...this.missionLoaderContext.squaddieData.teamStrategyById[team.id]
                        ]
                        : []
                ]
            )
        );

        battleOrchestratorState.battleState.battleCompletionStatus = BattleCompletionStatus.IN_PROGRESS;
        battleOrchestratorState.battleState.camera = BattleCameraHelper.clone({original: this.missionLoaderContext.mapSettings.camera});

        battleOrchestratorState.battleState.missionCompletionStatus = {};
        battleOrchestratorState.battleState.objectives = this.missionLoaderContext.objectives;
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
            missionLoaderContext: this.missionLoaderContext,
            missionId: "0000",
            resourceHandler: battleOrchestratorState.resourceHandler,
            squaddieRepository: battleOrchestratorState.squaddieRepository,
        }).then(async () => {
            await MissionLoader.loadPlayerArmyFromFile({
                missionLoaderContext: this.missionLoaderContext,
                resourceHandler: battleOrchestratorState.resourceHandler,
                squaddieRepository: battleOrchestratorState.squaddieRepository,
            });
        }).then(() => {
            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderContext: this.missionLoaderContext,
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
        this.missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext();
        this.appliedResources = false;
        this.backupBattleOrchestratorState = undefined;
        this.loadedBattleSaveState = undefined;
        this.errorFoundWhileLoading = false;
    }

    private addMidTurnEffects(battleOrchestratorState: BattleOrchestratorState) {
        ObjectRepositoryHelper.getBattleSquaddieIterator(battleOrchestratorState.squaddieRepository).forEach((info) => {
            const {battleSquaddie, battleSquaddieId} = info;
            const {squaddieTemplate} = getResultOrThrowError(
                ObjectRepositoryHelper.getSquaddieByBattleId(battleOrchestratorState.squaddieRepository, battleSquaddieId));

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
