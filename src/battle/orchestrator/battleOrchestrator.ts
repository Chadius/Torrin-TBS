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
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhaseTracker} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {TargetSquaddieInRange} from "../teamStrategy/targetSquaddieInRange";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MoveCloserToSquaddie} from "../teamStrategy/moveCloserToSquaddie";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {BattleCompletionStatus} from "./battleGameBoard";
import {GameModeEnum} from "../../utils/startupConfig";

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
            if (state.gameBoard.completionStatus === BattleCompletionStatus.VICTORY) {
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

    private setNextComponentMode(state: BattleOrchestratorState, currentComponent: BattleOrchestratorComponent, defaultNextMode: BattleOrchestratorMode) {
        const orchestrationChanges: BattleOrchestratorChanges = currentComponent.recommendStateChanges(state);

        let nextModeFromUnrewardedMissionObjective: BattleOrchestratorMode = undefined;
        let completionStatus: BattleCompletionStatus;
        if (orchestrationChanges.checkMissionObjectives === true) {
            ({
                nextModeFromUnrewardedMissionObjective,
                completionStatus
            } = this.findModeChangesAndCompletionStatusFromMissionObjectives(state, nextModeFromUnrewardedMissionObjective));
        }

        if (nextModeFromUnrewardedMissionObjective === undefined) {
            this.mode = orchestrationChanges.nextMode || defaultNextMode;
        }
        if (completionStatus) {
            state.gameBoard.completionStatus = completionStatus;
        }
    }

    private findModeChangesAndCompletionStatusFromMissionObjectives(state: BattleOrchestratorState, nextModeFromUnrewardedMissionObjective: BattleOrchestratorMode): {
        nextModeFromUnrewardedMissionObjective: BattleOrchestratorMode; completionStatus: BattleCompletionStatus
    } {
        let completionStatus: BattleCompletionStatus;
        const completedObjectives: MissionObjective[] = this.findCompleteButUnrewardedMissionObjectives(state);
        ({nextMode: nextModeFromUnrewardedMissionObjective, completionStatus}
                = this.calculateChangesBasedOnUnrewardedMissionObjectives(state, completedObjectives)
        );

        return {
            nextModeFromUnrewardedMissionObjective,
            completionStatus
        }
    }

    private updateUnknown(_: BattleOrchestratorState) {
        this.mode = BattleOrchestratorMode.LOADING_MISSION;
    }

    private displayBattleMap(state: BattleOrchestratorState, p: p5) {
        this.mapDisplay.update(state, p);
    }

    private findCompleteButUnrewardedMissionObjectives(state: BattleOrchestratorState): MissionObjective[] {
        return state.objectives.filter((objective: MissionObjective) =>
            objective.shouldBeComplete(state) && !objective.hasGivenReward
        );
    }

    private calculateChangesBasedOnUnrewardedMissionObjectives(state: BattleOrchestratorState, completedObjectives: MissionObjective[]): {
        completionStatus: BattleCompletionStatus,
        nextMode: BattleOrchestratorMode,
    } {
        const victoryObjective = completedObjectives.find((objective: MissionObjective) => objective.reward.rewardType === MissionRewardType.VICTORY);

        let returnValue: {
            nextMode: BattleOrchestratorMode,
            completionStatus: BattleCompletionStatus
        } = {
            nextMode: undefined,
            completionStatus: undefined,
        };

        let info;
        if (victoryObjective) {
            info = {
                nextMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
                cutsceneId: victoryObjective.cutsceneToPlayUponCompletion,
            };
            returnValue.completionStatus = BattleCompletionStatus.VICTORY;
        }

        if (info) {
            if (info.cutsceneId !== "") {
                this.cutscenePlayer.startCutscene(info.cutsceneId, state);
            }
            if (info.nextMode) {
                this.mode = info.nextMode;
                returnValue.nextMode = info.nextMode;
                return returnValue;
            }
        }
        return {
            nextMode: undefined,
            completionStatus: undefined
        };
    }

    private resetInternalState() {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this._uiControlSettings = new UIControlSettings({});

        this._battleComplete = false;
    }
}