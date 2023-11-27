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
import {BattleCompletionStatus} from "../battle/orchestrator/missionObjectivesAndCutscenes";

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
            this.backupBattleOrchestratorState = (state as BattleOrchestratorState).clone();

            const errorFound: Error = await this.loadBattleSaveStateFromFile((state as BattleOrchestratorState));
            if (errorFound) {
                return;
            }

            (state as BattleOrchestratorState).battleState.gameSaveFlags.loadingInProgress = true;
            this.resetBattleOrchestratorState(state as BattleOrchestratorState);
            await this.loadMissionDataFromFile(state as BattleOrchestratorState);
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
            this.applyMissionLoaderStatusToBattleOrchestratorState(state as BattleOrchestratorState);
            this.applySaveStateToBattleOrchestratorState(state as BattleOrchestratorState);
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

    private applySaveStateToBattleOrchestratorState(battleOrchestratorState: BattleOrchestratorState) {
        if (this.backupBattleOrchestratorState.battleState.gameSaveFlags.loadRequested) {
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
            battleOrchestratorState.battleState.gameSaveFlags.loadingInProgress = false;
            battleOrchestratorState.battleState.gameSaveFlags.loadRequested = false;
        }
    }

    private applyMissionLoaderStatusToBattleOrchestratorState(battleOrchestratorState: BattleOrchestratorState) {
        battleOrchestratorState.battleState.missionId = this.missionLoaderStatus.id;
        battleOrchestratorState.battleState.missionMap = this.missionLoaderStatus.missionMap;
        battleOrchestratorState.battleState.cutsceneCollection = this.missionLoaderStatus.cutsceneInfo.cutsceneCollection;
        battleOrchestratorState.battleState.cutsceneTriggers = [...this.missionLoaderStatus.cutsceneInfo.cutsceneTriggers];
        battleOrchestratorState.battleState.teamsByAffiliation = {...this.missionLoaderStatus.squaddieData.teamsByAffiliation};
        battleOrchestratorState.battleState.teamStrategyByAffiliation = {...this.missionLoaderStatus.squaddieData.teamStrategyByAffiliation};
        battleOrchestratorState.battleState.battleCompletionStatus = BattleCompletionStatus.IN_PROGRESS;
        battleOrchestratorState.battleState.missionCompletionStatus = {};

        battleOrchestratorState.battleState.objectives = this.missionLoaderStatus.objectives;
        battleOrchestratorState.battleState.objectives.forEach((objective: MissionObjective) => {
            const conditions: {
                [mission_condition_id: string]: boolean;
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
            missionLoaderStatus: this.missionLoaderStatus,
            missionId: "0000",
            resourceHandler: battleOrchestratorState.resourceHandler,
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

    private async loadBattleSaveStateFromFile(battleOrchestratorState: BattleOrchestratorState): Promise<Error> {
        if (!battleOrchestratorState.battleState.gameSaveFlags.loadRequested) {
            return;
        }

        let errorFound: Error = undefined;
        try {
            this.loadedBattleSaveState = await SaveFile.RetrieveFileContent();
        } catch (e) {
            battleOrchestratorState.battleState.gameSaveFlags.loadingInProgress = false;
            battleOrchestratorState.battleState.gameSaveFlags.loadRequested = false;
            this.errorFoundWhileLoading = true;
            console.error("Failed to load progress file from storage.");
            console.error(e);
            errorFound = e;
        }

        return errorFound;
    }
}
