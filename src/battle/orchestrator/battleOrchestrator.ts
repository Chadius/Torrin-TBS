import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "./battleOrchestratorComponent";
import {BattleOrchestratorState} from "./battleOrchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattlePlayerSquaddieSelector} from "../orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import p5 from "p5";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "../orchestratorComponents/battleSquaddieMapActivity";
import {BattlePlayerSquaddieTarget} from "../orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "../orchestratorComponents/battleSquaddieSquaddieActivity";
import {UIControlSettings} from "./uiControlSettings";
import {BattleComputerSquaddieSelector} from "../orchestratorComponents/battleComputerSquaddieSelector";
import {GameEngineChanges, GameEngineComponent} from "../../gameEngine/gameEngineComponent";
import {MouseButton} from "../../utils/mouseConfig";
import {GameEngineComponentState} from "../../gameEngine/gameEngine";
import {ResourceHandler, ResourceType} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhaseTracker} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {TargetSquaddieInRange} from "../teamStrategy/targetSquaddieInRange";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MoveCloserToSquaddie} from "../teamStrategy/moveCloserToSquaddie";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    LOADING_MISSION = "LOADING_MISSION",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    PLAYER_SQUADDIE_SELECTOR = "PLAYER_SQUADDIE_SELECTOR",
    PLAYER_SQUADDIE_TARGET = "PLAYER_SQUADDIE_TARGET",
    COMPUTER_SQUADDIE_SELECTOR = "COMPUTER_SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
    SQUADDIE_MAP_ACTIVITY = "SQUADDIE_MAP_ACTIVITY",
    SQUADDIE_SQUADDIE_ACTIVITY = "SQUADDIE_SQUADDIE_ACTIVITY",
}

export class BattleOrchestrator implements GameEngineComponent {
    mode: BattleOrchestratorMode;
    missionLoader: BattleMissionLoader;
    cutscenePlayer: BattleCutscenePlayer;
    playerSquaddieSelector: BattlePlayerSquaddieSelector;
    playerSquaddieTarget: BattlePlayerSquaddieTarget;
    computerSquaddieSelector: BattleComputerSquaddieSelector;
    squaddieMapActivity: BattleSquaddieMapActivity;
    squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    squaddieMover: BattleSquaddieMover;
    mapDisplay: BattleMapDisplay;
    phaseController: BattlePhaseController;

    constructor({
                    cutscenePlayer,
                    mapDisplay,
                    missionLoader,
                    phaseController,
                    squaddieMapActivity,
                    squaddieMover,
                    squaddieSquaddieActivity,
                    playerSquaddieSelector,
                    playerSquaddieTarget,
                    computerSquaddieSelector,
                }: {
        missionLoader: BattleMissionLoader,
        cutscenePlayer: BattleCutscenePlayer,
        playerSquaddieSelector: BattlePlayerSquaddieSelector,
        playerSquaddieTarget: BattlePlayerSquaddieTarget,
        computerSquaddieSelector: BattleComputerSquaddieSelector,
        squaddieMapActivity: BattleSquaddieMapActivity,
        squaddieSquaddieActivity: BattleSquaddieSquaddieActivity,
        squaddieMover: BattleSquaddieMover,
        mapDisplay: BattleMapDisplay,
        phaseController: BattlePhaseController,
    }) {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this._uiControlSettings = new UIControlSettings({});

        this.missionLoader = missionLoader;
        this.cutscenePlayer = cutscenePlayer;
        this.playerSquaddieSelector = playerSquaddieSelector;
        this.playerSquaddieTarget = playerSquaddieTarget;
        this.computerSquaddieSelector = computerSquaddieSelector;
        this.squaddieMapActivity = squaddieMapActivity;
        this.squaddieMover = squaddieMover;
        this.mapDisplay = mapDisplay;
        this.phaseController = phaseController;
        this.squaddieSquaddieActivity = squaddieSquaddieActivity;
    }

    private _uiControlSettings: UIControlSettings;

    get uiControlSettings(): UIControlSettings {
        return this._uiControlSettings;
    }

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges {
        return undefined;
    }

    public getCurrentComponent(): BattleOrchestratorComponent {
        switch (this.mode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                return this.missionLoader;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                return this.cutscenePlayer;
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                return this.phaseController;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR:
                return this.playerSquaddieSelector;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET:
                return this.playerSquaddieTarget;
            case BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR:
                return this.computerSquaddieSelector;
            case BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY:
                return this.squaddieMapActivity;
            case BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY:
                return this.squaddieSquaddieActivity;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                return this.squaddieMover;
            default:
                return undefined;
        }
    }

    public getCurrentMode(): BattleOrchestratorMode {
        return this.mode;
    }

    public update(state: BattleOrchestratorState, p: p5) {
        if (this.uiControlSettings.displayBattleMap === true && this.mode !== BattleOrchestratorMode.LOADING_MISSION) {
            this.displayBattleMap(state, p);
        }

        switch (this.mode) {
            case BattleOrchestratorMode.UNKNOWN:
                this.updateUnknown(state);
                break;
            case BattleOrchestratorMode.LOADING_MISSION:
                this.updateComponent(state, this.missionLoader, p, BattleOrchestratorMode.CUTSCENE_PLAYER);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                this.updateComponent(state, this.cutscenePlayer, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                this.updateComponent(state, this.phaseController, p, BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
                break;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR:
                this.updateComponent(state, this.playerSquaddieSelector, p, BattleOrchestratorMode.SQUADDIE_MOVER);
                break;
            case BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR:
                this.updateComponent(state, this.computerSquaddieSelector, p, BattleOrchestratorMode.SQUADDIE_MOVER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY:
                this.updateComponent(state, this.squaddieMapActivity, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY:
                this.updateComponent(state, this.squaddieSquaddieActivity, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateComponent(state, this.squaddieMover, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET:
                this.updateComponent(state, this.playerSquaddieTarget, p, BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
                break;
            default:
                throw new Error(`update does not know about ${this.mode}, cannot switch mode`);
        }
    }

    public updateComponent(state: BattleOrchestratorState, currentComponent: BattleOrchestratorComponent, p: p5 | undefined, defaultNextMode: BattleOrchestratorMode) {
        currentComponent.update(state, p);
        const newUIControlSettingsChanges = currentComponent.uiControlSettings(state);
        this.uiControlSettings.update(newUIControlSettingsChanges);

        if (currentComponent.hasCompleted(state)) {
            const orchestrationChanges: BattleOrchestratorChanges = currentComponent.recommendStateChanges(state);
            this.mode = orchestrationChanges.nextMode || defaultNextMode;
            currentComponent.reset(state);
        }
    }

    public mouseClicked(state: BattleOrchestratorState, mouseButton: MouseButton, mouseX: number, mouseY: number) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        this.getCurrentComponent().mouseEventHappened(
            state,
            mouseEvent
        )

        if (
            this.uiControlSettings.letMouseScrollCamera === true
        ) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent);
        }
    }

    public mouseMoved(state: BattleOrchestratorState, mouseX: number, mouseY: number) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.MOVED,
            mouseX,
            mouseY,
        };

        this.getCurrentComponent().mouseEventHappened(state, mouseEvent);

        if (
            this.uiControlSettings.letMouseScrollCamera === true
        ) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent);
        }
    }

    public keyPressed(state: BattleOrchestratorState, keyCode: number) {
        const keyEvent: OrchestratorComponentKeyEvent = {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode,
        }
        this.getCurrentComponent().keyEventHappened(state, keyEvent);

        if (
            this.uiControlSettings.displayBattleMap === true
        ) {
            this.mapDisplay.keyEventHappened(state, keyEvent);
        }
    }

    hasCompleted(state: GameEngineComponentState): boolean {
        return false;
    }

    reset(state: GameEngineComponentState): void {
    }

    setup({graphicsContext}: { graphicsContext: p5 }): BattleOrchestratorState {
        return new BattleOrchestratorState({
            resourceHandler: new ResourceHandler({
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
                ],
            }),
            squaddieRepo: new BattleSquaddieRepository(),
            battlePhaseTracker: new BattlePhaseTracker(),
            camera: new BattleCamera(0, 100),
            teamStrategyByAffiliation: {
                ENEMY: [
                    new TargetSquaddieInRange({
                        desiredAffiliation: SquaddieAffiliation.PLAYER
                    }),
                    new MoveCloserToSquaddie({
                        desiredAffiliation: SquaddieAffiliation.PLAYER
                    })
                ],
                ALLY: [new EndTurnTeamStrategy()],
                NONE: [new EndTurnTeamStrategy()],
            }
        });
    }

    private updateUnknown(_: BattleOrchestratorState) {
        this.mode = BattleOrchestratorMode.LOADING_MISSION;
    }

    private displayBattleMap(state: BattleOrchestratorState, p: p5) {
        this.mapDisplay.update(state, p);
    }
}
