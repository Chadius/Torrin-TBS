import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleCutscenePlayer} from "../battle/orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleComputerSquaddieSelector} from "../battle/orchestratorComponents/battleComputerSquaddieSelector";
import {BattleSquaddieUsesActionOnMap} from "../battle/orchestratorComponents/battleSquaddieUsesActionOnMap";
import {BattleSquaddieMover} from "../battle/orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../battle/orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePlayerSquaddieTarget} from "../battle/orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieUsesActionOnSquaddie} from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie";
import {MouseButton} from "../utils/mouseConfig";
import {GameModeEnum} from "../utils/startupConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {TitleScreen} from "../titleScreen/titleScreen";
import {TitleScreenState, TitleScreenStateHelper} from "../titleScreen/titleScreenState";
import {ResourceHandler, ResourceHandlerService} from "../resource/resourceHandler";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {BattleSaveState, BattleSaveStateService} from "../battle/history/battleSaveState";
import {SAVE_VERSION} from "../utils/fileHandling/saveFile";
import {GameEngineGameLoader} from "./gameEngineGameLoader";
import {InitializeBattle} from "../battle/orchestrator/initializeBattle";
import {Campaign} from "../campaign/campaign";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {isValidValue} from "../utils/validityCheck";
import {SaveSaveStateService} from "../dataLoader/saveSaveState";
import {FileState, FileStateService} from "./fileState";
import {MessageBoard} from "../message/messageBoard";
import {BattleHUDListener} from "../battle/hud/battleHUD";
import {MessageBoardMessageType} from "../message/messageBoardMessage";

export interface GameEngineState {
    modeThatInitiatedLoading: GameModeEnum;
    battleOrchestratorState: BattleOrchestratorState;
    repository: ObjectRepository;
    resourceHandler: ResourceHandler;
    titleScreenState: TitleScreenState;
    campaign: Campaign;
    campaignIdThatWasLoaded: string;
    fileState: FileState;
    messageBoard: MessageBoard;
}

export const GameEngineStateService = {
    new: ({
              battleOrchestratorState,
              titleScreenState,
              resourceHandler,
              previousMode,
              repository,
              campaign,
          }: {
        battleOrchestratorState?: BattleOrchestratorState;
        titleScreenState?: TitleScreenState;
        resourceHandler?: ResourceHandler;
        previousMode?: GameModeEnum;
        campaign?: Campaign;
        repository?: ObjectRepository;
    }): GameEngineState => {
        return {
            modeThatInitiatedLoading: previousMode ?? GameModeEnum.UNKNOWN,
            battleOrchestratorState: battleOrchestratorState ?? BattleOrchestratorStateService.newOrchestratorState({}),
            titleScreenState: titleScreenState ?? TitleScreenStateHelper.new(),
            fileState: FileStateService.new({}),
            campaign,
            campaignIdThatWasLoaded: isValidValue(campaign) ? campaign.id : undefined,
            repository,
            resourceHandler,
            messageBoard: new MessageBoard(),
        }
    }
}

export class GameEngine {
    gameEngineState: GameEngineState;
    gameEngineGameLoader: GameEngineGameLoader;
    private readonly graphicsContext: GraphicsContext;

    constructor({graphicsContext, startupMode}: {
        graphicsContext: GraphicsContext,
        startupMode: GameModeEnum
    }) {
        this.graphicsContext = graphicsContext;
        this._currentMode = startupMode;
    }

    private _titleScreen: TitleScreen;

    get titleScreen(): TitleScreen {
        return this._titleScreen;
    }

    get component(): GameEngineComponent {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreen;
            case GameModeEnum.LOADING_BATTLE:
                return this.gameEngineGameLoader;
            case GameModeEnum.BATTLE:
                return this.battleOrchestrator;
            default:
                throw new Error(`Cannot find component for Game Engine mode ${this.currentMode}`);
        }
    }

    private _currentMode: GameModeEnum;

    get currentMode(): GameModeEnum {
        return this._currentMode;
    }

    private _battleOrchestrator: BattleOrchestrator;

    get battleOrchestrator(): BattleOrchestrator {
        return this._battleOrchestrator;
    }

    private _resourceHandler: ResourceHandler;

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler;
    }

    async setup({graphicsContext, campaignId}: {
        graphicsContext: GraphicsContext,
        campaignId: string,
    }) {
        this._battleOrchestrator = new BattleOrchestrator({
            initializeBattle: new InitializeBattle(),
            cutscenePlayer: new BattleCutscenePlayer(),
            playerSquaddieSelector: new BattlePlayerSquaddieSelector(),
            computerSquaddieSelector: new BattleComputerSquaddieSelector(),
            squaddieUsesActionOnMap: new BattleSquaddieUsesActionOnMap(),
            squaddieMover: new BattleSquaddieMover(),
            mapDisplay: new BattleMapDisplay(),
            phaseController: new BattlePhaseController(),
            playerSquaddieTarget: new BattlePlayerSquaddieTarget(),
            squaddieUsesActionOnSquaddie: new BattleSquaddieUsesActionOnSquaddie(),
        });

        await this.lazyLoadResourceHandler({graphicsContext, campaignId});

        this._titleScreen = new TitleScreen({resourceHandler: this.resourceHandler});
        this.gameEngineGameLoader = new GameEngineGameLoader(campaignId);
        this.resetComponentStates();
    }

    async draw() {
        await this.update({graphicsContext: this.graphicsContext});
    }

    keyPressed(keyCode: number) {
        this.component.keyPressed(this.gameEngineState, keyCode);
    }

    mouseClicked(mouseButton: MouseButton, mouseX: number, mouseY: number) {
        this.component.mouseClicked(this.gameEngineState, mouseButton, mouseX, mouseY);
    }

    mouseMoved(mouseX: number, mouseY: number) {
        this.component.mouseMoved(this.gameEngineState, mouseX, mouseY);
    }

    async update({graphicsContext}: {
        graphicsContext: GraphicsContext
    }) {
        this.component.update(this.gameEngineState, graphicsContext);

        if (this.gameEngineState.fileState.saveSaveState.savingInProgress) {
            this.saveGameAndDownloadFile();
        }

        if (this.component.hasCompleted(this.gameEngineState)) {
            const orchestrationChanges: GameEngineChanges = this.component.recommendStateChanges(this.gameEngineState);
            if (!(
                orchestrationChanges.nextMode === GameModeEnum.LOADING_BATTLE
                && this.currentMode === GameModeEnum.BATTLE
            )) {
                this.component.reset(this.gameEngineState);
            }

            if (orchestrationChanges.nextMode === GameModeEnum.LOADING_BATTLE) {
                this.gameEngineState.modeThatInitiatedLoading = this.currentMode;
            }

            this._currentMode = orchestrationChanges.nextMode || GameModeEnum.TITLE_SCREEN;
            if (this.currentMode === GameModeEnum.TITLE_SCREEN) {
                this.gameEngineState.titleScreenState = TitleScreenStateHelper.new();
            }
        }
    }

    private resetComponentStates() {
        this.gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: this.battleOrchestrator.setup({}),
            titleScreenState: this.titleScreen.setup(),
            repository: ObjectRepositoryService.new(),
            resourceHandler: this.resourceHandler,
            campaign: undefined,
        });
        const battleHUDListener: BattleHUDListener = new BattleHUDListener("battleHUDListener");
        this.gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.STARTED_PLAYER_PHASE
        );
    }

    private async lazyLoadResourceHandler({
                                              graphicsContext,
                                              campaignId,
                                          }: {
        graphicsContext: GraphicsContext,
        campaignId: string,
    }) {
        if (this.resourceHandler === undefined) {
            this._resourceHandler = ResourceHandlerService.new({
                graphicsContext: graphicsContext,
                resourceLocators: [],
                imageLoader: undefined,
            });

            const resourceLocationsFilename = `assets/campaign/${campaignId}/resourceLocators.json`;
            try {
                await ResourceHandlerService.loadResourceLocations(this._resourceHandler, resourceLocationsFilename);
            } catch (e) {
                console.error(`Failed to load resource locations in file: ${resourceLocationsFilename}`);
                console.error(e);
                throw e;
            }
        }

        return this.resourceHandler;
    }

    private saveGameAndDownloadFile() {
        const saveData: BattleSaveState = BattleSaveStateService.newUsingBattleOrchestratorState({
            saveVersion: SAVE_VERSION,
            missionId: this.gameEngineState.battleOrchestratorState.battleState.missionId,
            battleOrchestratorState: this.gameEngineState.battleOrchestratorState,
            repository: this.gameEngineState.repository,
        });
        try {
            BattleSaveStateService.SaveToFile(saveData);
        } catch (error) {
            console.log(`Save game failed: ${error}`);
            this.gameEngineState.fileState.saveSaveState.errorDuringSaving = true;
            SaveSaveStateService.foundErrorDuringSaving(this.gameEngineState.fileState.saveSaveState);
        }
        SaveSaveStateService.savingAttemptIsComplete(this.gameEngineState.fileState.saveSaveState);
    }
}
