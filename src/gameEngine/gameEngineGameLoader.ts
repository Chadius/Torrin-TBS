import {GameEngineState} from "./gameEngine";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {MissionLoader, MissionLoaderContext} from "../battle/loading/missionLoader";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../battle/orchestrator/uiControlSettings";
import {GameModeEnum} from "../utils/startupConfig";
import {MissionObjective} from "../battle/missionResult/missionObjective";
import {MissionCondition} from "../battle/missionResult/missionCondition";
import {BattleSaveState, BattleSaveStateService} from "../battle/history/battleSaveState";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {DrawSquaddieUtilities} from "../battle/animation/drawSquaddie";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {BattleCompletionStatus} from "../battle/orchestrator/missionObjectivesAndCutscenes";
import {BattleCameraHelper} from "../battle/battleCamera";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {Campaign, CampaignService} from "../campaign/campaign";
import {isValidValue} from "../utils/validityCheck";
import {CampaignLoaderContext, CampaignLoaderService} from "../dataLoader/campaignLoader";
import {CampaignResources} from "../campaign/campaignResources";
import {LoadSaveStateService} from "../dataLoader/loadSaveState";

export class GameEngineGameLoader implements GameEngineComponent {
    campaignLoaderContext: CampaignLoaderContext;
    missionLoaderContext: MissionLoaderContext;
    appliedResources: boolean;
    backupBattleOrchestratorState: BattleOrchestratorState;
    loadedBattleSaveState: BattleSaveState;
    errorFoundWhileLoading: boolean;
    startedLoading: boolean;
    finishedLoading: boolean;

    constructor(campaignId: string) {
        this.resetInternalFields();
        this.campaignLoaderContext.campaignIdToLoad = campaignId;
    }

    async update(state: GameEngineState) {
        if (
            this.startedLoading === false
            && this.finishedLoading === false
        ) {
            this.startedLoading = true;
            this.backupBattleOrchestratorState = state.battleOrchestratorState.clone();

            try {
                await this.loadBattleSaveStateFromFile(state);
            } catch {
                return;
            }

            if (this.errorFoundWhileLoading) {
                return;
            }

            if (isValidValue(state.repository)) {
                ObjectRepositoryService.reset(state.repository);
            }

            if (this.campaignLoaderContext && isValidValue(this.campaignLoaderContext.campaignIdToLoad)) {
                this.resetBattleOrchestratorState(state.battleOrchestratorState);
                await this.loadCampaignDataFromFile(this.campaignLoaderContext.campaignIdToLoad, state).then(
                    async () => {
                        await this.loadMissionDataFromFile(state.campaign, state, state.repository).then(() => {
                            this.finishedLoading = true;
                        });
                    });
            }
            return;
        }

        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext: this.missionLoaderContext,
            resourceHandler: state.resourceHandler,
        });
        if (
            this.missionLoaderContext.resourcesPendingLoading.length > 0
            || this.missionLoaderContext.cutsceneInfo.cutsceneCollection === undefined
        ) {
            return;
        } else {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext: this.missionLoaderContext,
                resourceHandler: state.resourceHandler,
                repository: state.repository,
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

        const campaignHasFinishedLoading: boolean = isValidValue(this.campaignLoaderContext.campaignIdToLoad) && isValidValue(state.campaign);
        const missionHasFinishedLoading: boolean = this.missionLoaderContext.completionProgress.started
            && this.missionLoaderContext.completionProgress.loadedFileData;

        return campaignHasFinishedLoading
            && missionHasFinishedLoading
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
        if (!gameEngineState.loadSaveState.applicationCompletedLoad) {
            return;
        }

        let battleOrchestratorState = gameEngineState.battleOrchestratorState;
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: this.loadedBattleSaveState,
            battleOrchestratorState: battleOrchestratorState,
            squaddieRepository: gameEngineState.repository,
        });

        if (battleOrchestratorState.isValid) {
            this.backupBattleOrchestratorState = undefined;
            this.addMidTurnEffects(gameEngineState.repository);
        } else {
            console.error("Save file is incompatible. Reverting.");
            battleOrchestratorState.copyOtherOrchestratorState(this.backupBattleOrchestratorState);
            this.errorFoundWhileLoading = true;
        }
        LoadSaveStateService.reset(gameEngineState.loadSaveState);
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

    private async loadMissionDataFromFile(campaign: Campaign, state: GameEngineState, repository: ObjectRepository) {
        await MissionLoader.loadMissionFromFile({
            missionLoaderContext: this.missionLoaderContext,
            missionId: CampaignService.getNextMissionId(campaign),
            resourceHandler: state.resourceHandler,
            repository: repository,
        }).then(async () => {
            await MissionLoader.loadPlayerArmyFromFile({
                missionLoaderContext: this.missionLoaderContext,
                resourceHandler: state.resourceHandler,
                squaddieRepository: repository,
            });
        });
    }

    private async loadCampaignDataFromFile(campaignId: string, state: GameEngineState) {
        if (state.campaignIdThatWasLoaded === campaignId) {
            return;
        }

        const campaignData = await CampaignLoaderService.loadCampaignFromFile(campaignId);
        const campaignResources: CampaignResources = campaignData.resources;
        state.resourceHandler.loadResources(Object.values(campaignResources.missionMapMovementIconResourceKeys));
        state.resourceHandler.loadResources(Object.values(campaignResources.missionMapAttackIconResourceKeys));
        state.resourceHandler.loadResources(Object.values(campaignResources.missionAttributeIconResourceKeys));
        state.resourceHandler.loadResources(Object.values(campaignResources.actionEffectSquaddieTemplateButtonIcons));
        this.campaignLoaderContext.resourcesPendingLoading = [
            ...this.campaignLoaderContext.resourcesPendingLoading,
            ...Object.values(campaignResources.missionMapMovementIconResourceKeys),
            ...Object.values(campaignResources.missionMapAttackIconResourceKeys),
            ...Object.values(campaignResources.missionAttributeIconResourceKeys),
            ...Object.values(campaignResources.actionEffectSquaddieTemplateButtonIcons),
        ];
        state.campaignIdThatWasLoaded = campaignData.id;
        state.campaign = campaignData;
    }

    private resetBattleOrchestratorState(state: BattleOrchestratorState) {
        state.copyOtherOrchestratorState(
            BattleOrchestratorStateService.newOrchestratorState({})
        );
    }

    private resetInternalFields() {
        this.startedLoading = false;
        this.finishedLoading = false;
        this.missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext();
        this.campaignLoaderContext = isValidValue(this.campaignLoaderContext)
            ? this.campaignLoaderContext
            : CampaignLoaderService.newLoaderContext();
        this.appliedResources = false;
        this.backupBattleOrchestratorState = undefined;
        this.loadedBattleSaveState = undefined;
        this.errorFoundWhileLoading = false;
    }

    private addMidTurnEffects(repository: ObjectRepository) {
        ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach((info) => {
            const {battleSquaddie, battleSquaddieId} = info;
            const {squaddieTemplate} = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));
            DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, repository);
        });
    }

    private async loadBattleSaveStateFromFile(gameEngineState: GameEngineState): Promise<void> {
        if (!gameEngineState.loadSaveState.userRequestedLoad) {
            return;
        }

        if (gameEngineState.loadSaveState.applicationStartedLoad) {
            return;
        }

        LoadSaveStateService.applicationStartsLoad(gameEngineState.loadSaveState);
        await SaveFile.RetrieveFileContent()
            .then((saveState: BattleSaveState) => {
                this.loadedBattleSaveState = saveState;
                LoadSaveStateService.applicationCompletesLoad(gameEngineState.loadSaveState, this.loadedBattleSaveState);
            }).catch((reason) => {
                if (reason === "user canceled") {
                    LoadSaveStateService.userCancelsLoad(gameEngineState.loadSaveState);
                } else {
                    LoadSaveStateService.applicationErrorsWhileLoading(gameEngineState.loadSaveState);
                }
                this.errorFoundWhileLoading = true;
                console.error("Failed to load progress file from storage.");
                console.error(reason);
            });
    }
}
