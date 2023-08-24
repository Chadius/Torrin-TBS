import p5 from "p5";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattleMissionLoader} from "../battle/orchestratorComponents/battleMissionLoader";
import {BattleCutscenePlayer} from "../battle/orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleComputerSquaddieSelector} from "../battle/orchestratorComponents/battleComputerSquaddieSelector";
import {BattleSquaddieMapActivity} from "../battle/orchestratorComponents/battleSquaddieMapActivity";
import {BattleSquaddieMover} from "../battle/orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../battle/orchestratorComponents/battleMapDisplay";
import {BattlePhaseController} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePlayerSquaddieTarget} from "../battle/orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "../battle/orchestratorComponents/battleSquaddieSquaddieActivity";
import {MouseButton} from "../utils/mouseConfig";
import {GameModeEnum} from "../utils/startupConfig";
import {GameEngineChanges, GameEngineComponent} from "./gameEngineComponent";
import {TitleScreen} from "../titleScreen/titleScreen";
import {TitleScreenState} from "../titleScreen/titleScreenState";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";

export type GameEngineComponentState = BattleOrchestratorState | TitleScreenState;

export class GameEngine {
    private readonly graphicsContext: p5;

    constructor({graphicsContext, startupMode}: { graphicsContext: p5, startupMode: GameModeEnum }) {
        this.graphicsContext = graphicsContext;
        this._currentMode = startupMode;
    }

    private _titleScreen: TitleScreen;

    get titleScreen(): TitleScreen {
        return this._titleScreen;
    }

    private _titleScreenState: TitleScreenState;

    get titleScreenState(): TitleScreenState {
        return this._titleScreenState;
    }

    get component(): GameEngineComponent {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreen;
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

    private _battleOrchestratorState: BattleOrchestratorState;

    get battleOrchestratorState(): BattleOrchestratorState {
        return this._battleOrchestratorState;
    }

    private _resourceHandler: ResourceHandler;

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler;
    }

    setup({graphicsContext}: { graphicsContext: p5 }) {
        this._battleOrchestrator = new BattleOrchestrator({
            missionLoader: new BattleMissionLoader(),
            cutscenePlayer: new BattleCutscenePlayer({cutsceneById: {}}),
            playerSquaddieSelector: new BattlePlayerSquaddieSelector(),
            computerSquaddieSelector: new BattleComputerSquaddieSelector(),
            squaddieMapActivity: new BattleSquaddieMapActivity(),
            squaddieMover: new BattleSquaddieMover(),
            mapDisplay: new BattleMapDisplay(),
            phaseController: new BattlePhaseController(),
            playerSquaddieTarget: new BattlePlayerSquaddieTarget(),
            squaddieSquaddieActivity: new BattleSquaddieSquaddieActivity(),
        });

        this.lazyLoadResourceHandler({graphicsContext});

        this._battleOrchestratorState = this.battleOrchestrator.setup({resourceHandler: this.resourceHandler});
        this._titleScreen = new TitleScreen({resourceHandler: this.resourceHandler});
        this._titleScreenState = this.titleScreen.setup({graphicsContext})
    }

    draw() {
        this.component.update(this.getComponentState(), this.graphicsContext);
        this.update({graphicsContext: this.graphicsContext});
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

    update({graphicsContext}: { graphicsContext: p5 }) {
        this.component.update(this.getComponentState(), graphicsContext);
        if (this.component.hasCompleted(this.getComponentState())) {
            const orchestrationChanges: GameEngineChanges = this.component.recommendStateChanges(this.getComponentState());
            this.component.reset(this.getComponentState());
            this._currentMode = orchestrationChanges.nextMode || GameModeEnum.TITLE_SCREEN;
        }

    }

    private getComponentState(): GameEngineComponentState {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreenState;
            case GameModeEnum.BATTLE:
                return this.battleOrchestratorState;
            default:
                throw new Error(`Cannot find component state for Game Engine mode ${this.currentMode}`);
        }
    }


    private lazyLoadResourceHandler({graphicsContext}: { graphicsContext: p5 }) {
        if (this.resourceHandler === undefined) {
            this._resourceHandler = new ResourceHandler({
                p: graphicsContext,
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
                        path: "assets/action-neutral-demon-slither.png",
                        key: "action neutral demon slither",
                    },
                ],
            })
        }

        return this.resourceHandler;
    }
}
