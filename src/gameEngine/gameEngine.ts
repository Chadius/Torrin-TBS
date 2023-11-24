import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
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
import {TitleScreenState} from "../titleScreen/titleScreenState";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {BattleSaveState, BattleSaveStateHandler} from "../battle/history/battleSaveState";
import {SAVE_VERSION} from "../utils/fileHandling/saveFile";
import {GameEngineBattleMissionLoader} from "./gameEngineBattleMissionLoader";
import {InitializeBattle} from "../battle/orchestrator/initializeBattle";

export type GameEngineComponentState = BattleOrchestratorState | TitleScreenState;

interface GameLoadContext {
    backupBattleOrchestratorState: BattleOrchestratorState;
}

export class GameEngine {
    battleOrchestratorState: BattleOrchestratorState;
    titleScreenState: TitleScreenState;
    battleMissionLoader: GameEngineBattleMissionLoader;
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
                return this.battleMissionLoader;
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
        graphicsContext: GraphicsContext
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
        this.battleMissionLoader = new GameEngineBattleMissionLoader();
        this.resetComponentStates(graphicsContext);
    }

    async draw() {
        await this.update({graphicsContext: this.graphicsContext});
    }

    keyPressed(keyCode: number) {
        this.component.keyPressed(this.getComponentState(), keyCode);
    }

    mouseClicked(mouseButton: MouseButton, mouseX: number, mouseY: number) {
        this.component.mouseClicked(this.getComponentState(), mouseButton, mouseX, mouseY);
    }

    mouseMoved(mouseX: number, mouseY: number) {
        this.component.mouseMoved(this.getComponentState(), mouseX, mouseY);
    }

    async update({graphicsContext}: {
        graphicsContext: GraphicsContext
    }) {
        this.component.update(this.getComponentState(), graphicsContext);

        if (this.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress) {
            this.saveGameAndDownloadFile();
        }

        if (this.component.hasCompleted(this.getComponentState())) {
            const orchestrationChanges: GameEngineChanges = this.component.recommendStateChanges(this.getComponentState());
            if (!(
                orchestrationChanges.nextMode === GameModeEnum.LOADING_BATTLE
                && this.currentMode === GameModeEnum.BATTLE
            )) {
                this.component.reset(this.getComponentState());
            }
            this._currentMode = orchestrationChanges.nextMode || GameModeEnum.TITLE_SCREEN;
            if (this.currentMode === GameModeEnum.TITLE_SCREEN) {
                this.titleScreenState = new TitleScreenState({});
            }
        }
    }

    private resetComponentStates(graphicsContext: GraphicsContext) {
        this.battleOrchestratorState = this.battleOrchestrator.setup({resourceHandler: this.resourceHandler});
        this.titleScreenState = this.titleScreen.setup();
    }

    private getComponentState(): GameEngineComponentState {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreenState;
            case GameModeEnum.BATTLE:
            case GameModeEnum.LOADING_BATTLE:
                return this.battleOrchestratorState;
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
                        path: "assets/icon-hit-points.png",
                        key: "hit points icon",
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
                        path: "assets/splash-victory-screen.png",
                        key: "splash victory",
                    },
                    {
                        type: ResourceType.IMAGE,
                        path: "assets/splash-defeat-screen.png",
                        key: "splash defeat",
                    },
                ],
            })
        }

        return this.resourceHandler;
    }

    private saveGameAndDownloadFile() {
        const saveData: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            saveVersion: SAVE_VERSION,
            missionId: "Test demo mission",
            battleOrchestratorState: this.battleOrchestratorState,
        });
        try {
            BattleSaveStateHandler.SaveToFile(saveData);
        } catch (error) {
            console.log(`Save game failed: ${error}`);
            this.battleOrchestratorState.battleState.gameSaveFlags.errorDuringSaving = true;
        }
        this.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress = false;
    }
}
