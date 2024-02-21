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
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {BattleSaveState, BattleSaveStateService} from "../battle/history/battleSaveState";
import {SAVE_VERSION} from "../utils/fileHandling/saveFile";
import {GameEngineGameLoader} from "./gameEngineGameLoader";
import {InitializeBattle} from "../battle/orchestrator/initializeBattle";
import {Campaign} from "../campaign/campaign";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {isValidValue} from "../utils/validityCheck";
import {LoadSaveState, LoadSaveStateService} from "../dataLoader/loadSaveState";

export interface GameEngineState {
    modeThatInitiatedLoading: GameModeEnum;
    battleOrchestratorState: BattleOrchestratorState;
    repository: ObjectRepository;
    resourceHandler: ResourceHandler;
    titleScreenState: TitleScreenState;
    gameSaveFlags: {
        errorDuringSaving: boolean;
        savingInProgress: boolean;
    },
    campaign: Campaign;
    campaignIdThatWasLoaded: string;
    loadSaveState: LoadSaveState;
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
            gameSaveFlags: {
                errorDuringSaving: false,
                savingInProgress: false,
            },
            campaign,
            campaignIdThatWasLoaded: isValidValue(campaign) ? campaign.id : undefined,
            repository,
            resourceHandler,
            loadSaveState: LoadSaveStateService.new({}),
        }
    },
    clone: ({original}: { original: GameEngineState }): GameEngineState => {
        return {
            modeThatInitiatedLoading: original.modeThatInitiatedLoading,
            titleScreenState: {...original.titleScreenState},
            battleOrchestratorState: original.battleOrchestratorState.clone(),
            gameSaveFlags: {...original.gameSaveFlags},
            campaign: {...original.campaign},
            campaignIdThatWasLoaded: original.campaignIdThatWasLoaded,
            repository: original.repository,
            resourceHandler: original.resourceHandler,
            loadSaveState: {...original.loadSaveState},
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

    setup({graphicsContext}: {
        graphicsContext: GraphicsContext,
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

        this.lazyLoadResourceHandler({graphicsContext});

        this._titleScreen = new TitleScreen({resourceHandler: this.resourceHandler});
        this.gameEngineGameLoader = undefined;
        this.resetComponentStates();
    }

    setCampaignId(campaignId: string) {
        this.gameEngineGameLoader = new GameEngineGameLoader(campaignId);
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

        if (this.gameEngineState.gameSaveFlags.savingInProgress) {
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
    }

    private getComponentState(): BattleOrchestratorState | TitleScreenState {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.gameEngineState.titleScreenState;
            case GameModeEnum.BATTLE:
            case GameModeEnum.LOADING_BATTLE:
                return this.gameEngineState.battleOrchestratorState;
            default:
                throw new Error(`Cannot find component state for Game Engine mode ${this.currentMode}`);
        }
    }

    private lazyLoadResourceHandler({graphicsContext}: {
        graphicsContext: GraphicsContext
    }) {
        if (this.resourceHandler === undefined) {
            this._resourceHandler = new ResourceHandler({
                graphicsContext: graphicsContext,
                allResources: [
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/testPortrait0001.png",
                        key: "crazy pete face",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-young-torrin.png",
                        key: "map icon young torrin",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-sir-camil.png",
                        key: "map icon sir camil",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-demon-slither.png",
                        key: "map icon demon slither",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-1-action.png",
                        key: "map icon move 1 action"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-2-actions.png",
                        key: "map icon move 2 actions"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-move-3-actions.png",
                        key: "map icon move 3 actions"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/map-icon-attack-1-action.png",
                        key: "map icon attack 1 action"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-crusaders.png",
                        key: "affiliate_icon_crusaders"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-infiltrators.png",
                        key: "affiliate_icon_infiltrators"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-western.png",
                        key: "affiliate_icon_western"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/affiliate-icon-none.png",
                        key: "affiliate_icon_none"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/phase-banner-player.png",
                        key: "phase banner player",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/phase-banner-enemy.png",
                        key: "phase banner enemy",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/icon-armor-class.png",
                        key: "armor class icon",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/logo-torrins-trial.png",
                        key: "torrins trial logo",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/cutscene-portrait-young-torrin.png",
                        key: "young torrin cutscene portrait",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/cutscene-portrait-sir-camil.png",
                        key: "sir camil cutscene portrait",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/2023-09-24-TorrinTrialHUD.png",
                        key: "tutorial-hud",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/2023-09-24-TorrinTrialMap.png",
                        key: "tutorial-map",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/action-neutral-demon-slither.png",
                        key: "action neutral demon slither",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-demon-slither-attack.png",
                        key: "combat-demon-slither-attack",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-demon-slither-damaged.png",
                        key: "combat-demon-slither-damaged",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-demon-slither-dead.png",
                        key: "combat-demon-slither-dead",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-demon-slither-neutral.png",
                        key: "combat-demon-slither-neutral",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-demon-slither-targeted.png",
                        key: "combat-demon-slither-targeted",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-attack.png",
                        key: "combat-sir-camil-attack",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-damaged.png",
                        key: "combat-sir-camil-damaged",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-dead.png",
                        key: "combat-sir-camil-dead",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-neutral.png",
                        key: "combat-sir-camil-neutral",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-targeted.png",
                        key: "combat-sir-camil-targeted",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-assisting.png",
                        key: "combat-sir-camil-assisting",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-sir-camil-thankful.png",
                        key: "combat-sir-camil-thankful",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-attack.png",
                        key: "combat-young-torrin-attack",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-damaged.png",
                        key: "combat-young-torrin-damaged",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-dead.png",
                        key: "combat-young-torrin-dead",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-neutral.png",
                        key: "combat-young-torrin-neutral",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-targeted.png",
                        key: "combat-young-torrin-targeted",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-assisting.png",
                        key: "combat-young-torrin-assisting",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/combat-young-torrin-thankful.png",
                        key: "combat-young-torrin-thankful",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/map-icon-petra.png",
                        key: "map icon petra",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-neutral.png",
                        key: "petra cutscene portrait",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-attacking.png",
                        key: "combat-petra-attack",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-damaged.png",
                        key: "combat-petra-damaged",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-dead.png",
                        key: "combat-petra-dead",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-neutral.png",
                        key: "combat-petra-neutral",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-targeted.png",
                        key: "combat-petra-targeted",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-assisting.png",
                        key: "combat-petra-assisting",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/playerArmy/petra/combat-petra-thankful.png",
                        key: "combat-petra-thankful",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/splash-victory-screen.png",
                        key: "splash victory",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/splash-defeat-screen.png",
                        key: "splash defeat",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/decisions/decision-button-unknown-64.png",
                        key: "decision-button-unknown"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/decisions/decision-button-sword-64.png",
                        key: "decision-button-sword"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/decisions/decision-button-heart-64.png",
                        key: "decision-button-heart"
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/decisions/decision-button-bow-64.png",
                        key: "decision-button-bow"
                    },
                ],
            })
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
            this.gameEngineState.gameSaveFlags.errorDuringSaving = true;
        }
        this.gameEngineState.gameSaveFlags.savingInProgress = false;
    }
}
