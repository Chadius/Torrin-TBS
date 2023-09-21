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
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "../orchestratorComponents/battleSquaddieMapActivity";
import {BattlePlayerSquaddieTarget} from "../orchestratorComponents/battlePlayerSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "../orchestratorComponents/battleSquaddieSquaddieActivity";
import {UIControlSettings} from "./uiControlSettings";
import {BattleComputerSquaddieSelector} from "../orchestratorComponents/battleComputerSquaddieSelector";
import {GameEngineChanges, GameEngineComponent} from "../../gameEngine/gameEngineComponent";
import {MouseButton} from "../../utils/mouseConfig";
import {GameEngineComponentState} from "../../gameEngine/gameEngine";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCamera} from "../battleCamera";
import {TargetSquaddieInRange} from "../teamStrategy/targetSquaddieInRange";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MoveCloserToSquaddie} from "../teamStrategy/moveCloserToSquaddie";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {BattleCompletionStatus} from "./battleGameBoard";
import {GameModeEnum} from "../../utils/startupConfig";
import {DefaultBattleOrchestrator} from "./defaultBattleOrchestrator";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GetCutsceneTriggersToActivate} from "../cutscene/missionCutsceneService";

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
    defaultBattleOrchestrator: DefaultBattleOrchestrator;
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

        this.resetInternalState();
    }

    private _battleComplete: boolean;

    get battleComplete(): boolean {
        return this._battleComplete;
    }

    private _uiControlSettings: UIControlSettings;

    get uiControlSettings(): UIControlSettings {
        return this._uiControlSettings;
    }

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges {
        return {
            nextMode: GameModeEnum.TITLE_SCREEN
        };
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
                return this.defaultBattleOrchestrator;
        }
    }

    public getCurrentMode(): BattleOrchestratorMode {
        return this.mode;
    }

    public update(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (this.uiControlSettings.displayBattleMap === true && this.mode !== BattleOrchestratorMode.LOADING_MISSION) {
            this.displayBattleMap(state, graphicsContext);
        }

        switch (this.mode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                this.updateComponent(state, this.missionLoader, graphicsContext, BattleOrchestratorMode.CUTSCENE_PLAYER);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                this.updateComponent(state, this.cutscenePlayer, graphicsContext, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                this.updateComponent(state, this.phaseController, graphicsContext, BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
                break;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR:
                this.updateComponent(state, this.playerSquaddieSelector, graphicsContext, BattleOrchestratorMode.SQUADDIE_MOVER);
                break;
            case BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR:
                this.updateComponent(state, this.computerSquaddieSelector, graphicsContext, BattleOrchestratorMode.SQUADDIE_MOVER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY:
                this.updateComponent(state, this.squaddieMapActivity, graphicsContext, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY:
                this.updateComponent(state, this.squaddieSquaddieActivity, graphicsContext, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateComponent(state, this.squaddieMover, graphicsContext, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET:
                this.updateComponent(state, this.playerSquaddieTarget, graphicsContext, BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
                break;
            default:
                this.updateComponent(state, this.defaultBattleOrchestrator, graphicsContext, BattleOrchestratorMode.LOADING_MISSION);
                break;
        }
    }

    public updateComponent(state: BattleOrchestratorState, currentComponent: BattleOrchestratorComponent, graphicsContext: GraphicsContext, defaultNextMode: BattleOrchestratorMode) {
        currentComponent.update(state, graphicsContext);
        const newUIControlSettingsChanges = currentComponent.uiControlSettings(state);
        this.uiControlSettings.update(newUIControlSettingsChanges);

        if (currentComponent.hasCompleted(state)) {
            if (
                state.gameBoard.completionStatus === BattleCompletionStatus.VICTORY
                || state.gameBoard.completionStatus === BattleCompletionStatus.DEFEAT
            ) {
                this._battleComplete = true;
            }
            this.setNextComponentMode(state, currentComponent, defaultNextMode);

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
        return this.battleComplete;
    }

    reset(state: GameEngineComponentState): void {
        [
            this.missionLoader,
            this.cutscenePlayer,
            this.playerSquaddieSelector,
            this.playerSquaddieTarget,
            this.computerSquaddieSelector,
            this.squaddieMapActivity,
            this.squaddieMover,
            this.mapDisplay,
            this.phaseController,
            this.squaddieSquaddieActivity,
        ].filter((component: BattleOrchestratorComponent) => component)
            .forEach((component: BattleOrchestratorComponent) => {
                component.reset(state as BattleOrchestratorState);
            });

        this.resetInternalState();

        const squaddieRepo = (state as BattleOrchestratorState).squaddieRepository;
        if (squaddieRepo) {
            squaddieRepo.reset();
        }
    }

    setup({
              resourceHandler
          }: {
        resourceHandler: ResourceHandler
    }): BattleOrchestratorState {
        return new BattleOrchestratorState({
            resourceHandler,
            squaddieRepo: new BattleSquaddieRepository(),
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

    private setNextComponentMode(state: BattleOrchestratorState, currentComponent: BattleOrchestratorComponent, defaultNextMode: BattleOrchestratorMode) {
        const orchestrationChanges: BattleOrchestratorChanges = currentComponent.recommendStateChanges(state);
        const cutsceneTriggersToActivate = GetCutsceneTriggersToActivate(state, this.mode);

        if (orchestrationChanges.checkMissionObjectives === true) {
            let completionStatus: BattleCompletionStatus = this.checkMissionCompleteStatus(state);
            if (completionStatus) {
                state.gameBoard.completionStatus = completionStatus;
            }
        }

        if (cutsceneTriggersToActivate.cutsceneTriggersToReactTo.length > 0) {
            const nextCutscene = cutsceneTriggersToActivate.cutsceneTriggersToReactTo[0];
            this.cutscenePlayer.startCutscene(nextCutscene.cutsceneId, state);
            nextCutscene.systemReactedToTrigger = true;
            this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER;
            return;
        }

        this.mode = orchestrationChanges.nextMode || defaultNextMode;
    }

    private checkMissionCompleteStatus(state: BattleOrchestratorState): BattleCompletionStatus {
        const defeatObjectives = state.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.DEFEAT && objective.shouldBeComplete(state) && !objective.hasGivenReward
        );
        if (defeatObjectives) {
            return BattleCompletionStatus.DEFEAT;
        }

        const victoryObjectives = state.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.VICTORY && objective.shouldBeComplete(state) && !objective.hasGivenReward
        );
        if (victoryObjectives) {
            return BattleCompletionStatus.VICTORY;
        }

        return undefined;
    }

    private displayBattleMap(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.mapDisplay.update(state, graphicsContext);
    }

    private resetInternalState() {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this.defaultBattleOrchestrator = new DefaultBattleOrchestrator();
        this._uiControlSettings = new UIControlSettings({});

        this._battleComplete = false;
    }
}
