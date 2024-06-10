import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "./battleOrchestratorComponent"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "./battleOrchestratorState"
import { BattleCutscenePlayer } from "../orchestratorComponents/battleCutscenePlayer"
import { BattlePlayerSquaddieSelector } from "../orchestratorComponents/battlePlayerSquaddieSelector"
import { BattleSquaddieMover } from "../orchestratorComponents/battleSquaddieMover"
import { BattleMapDisplay } from "../orchestratorComponents/battleMapDisplay"
import { BattlePhaseController } from "../orchestratorComponents/battlePhaseController"
import { BattleSquaddieUsesActionOnMap } from "../orchestratorComponents/battleSquaddieUsesActionOnMap"
import { BattlePlayerSquaddieTarget } from "../orchestratorComponents/battlePlayerSquaddieTarget"
import { BattleSquaddieUsesActionOnSquaddie } from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { UIControlSettings } from "./uiControlSettings"
import { BattleComputerSquaddieSelector } from "../orchestratorComponents/battleComputerSquaddieSelector"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../../gameEngine/gameEngineComponent"
import { MouseButton } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { BattleCompletionStatus } from "./missionObjectivesAndCutscenes"
import { GameModeEnum } from "../../utils/startupConfig"
import { DefaultBattleOrchestrator } from "./defaultBattleOrchestrator"
import { FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat } from "../cutscene/missionCutsceneService"
import { MissionStatisticsHandler } from "../missionStatistics/missionStatistics"
import { TriggeringEvent } from "../../cutscene/cutsceneTrigger"
import { InitializeBattle } from "./initializeBattle"
import { PlayerHudController } from "../orchestratorComponents/playerHudController"
import { BattleHUDService } from "../hud/battleHUD"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    PLAYER_HUD_CONTROLLER = "PLAYER_HUD_CONTROLLER",
    PLAYER_SQUADDIE_SELECTOR = "PLAYER_SQUADDIE_SELECTOR",
    PLAYER_SQUADDIE_TARGET = "PLAYER_SQUADDIE_TARGET",
    COMPUTER_SQUADDIE_SELECTOR = "COMPUTER_SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
    SQUADDIE_USES_ACTION_ON_MAP = "SQUADDIE_USES_ACTION_ON_MAP",
    SQUADDIE_USES_ACTION_ON_SQUADDIE = "SQUADDIE_USES_ACTION_ON_SQUADDIE",
}

export class BattleOrchestrator implements GameEngineComponent {
    mode: BattleOrchestratorMode

    cutscenePlayer: BattleCutscenePlayer
    playerSquaddieSelector: BattlePlayerSquaddieSelector
    playerSquaddieTarget: BattlePlayerSquaddieTarget
    computerSquaddieSelector: BattleComputerSquaddieSelector
    squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
    squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
    squaddieMover: BattleSquaddieMover
    defaultBattleOrchestrator: DefaultBattleOrchestrator
    mapDisplay: BattleMapDisplay
    phaseController: BattlePhaseController
    initializeBattle: InitializeBattle
    playerHudController: PlayerHudController

    constructor({
        cutscenePlayer,
        mapDisplay,
        phaseController,
        squaddieUsesActionOnMap,
        squaddieMover,
        squaddieUsesActionOnSquaddie,
        playerSquaddieSelector,
        playerSquaddieTarget,
        computerSquaddieSelector,
        playerHudController,
        initializeBattle,
    }: {
        cutscenePlayer: BattleCutscenePlayer
        playerSquaddieSelector: BattlePlayerSquaddieSelector
        playerSquaddieTarget: BattlePlayerSquaddieTarget
        computerSquaddieSelector: BattleComputerSquaddieSelector
        squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
        squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
        squaddieMover: BattleSquaddieMover
        mapDisplay: BattleMapDisplay
        phaseController: BattlePhaseController
        playerHudController: PlayerHudController
        initializeBattle: InitializeBattle
    }) {
        this.cutscenePlayer = cutscenePlayer
        this.playerSquaddieSelector = playerSquaddieSelector
        this.playerSquaddieTarget = playerSquaddieTarget
        this.computerSquaddieSelector = computerSquaddieSelector
        this.squaddieUsesActionOnMap = squaddieUsesActionOnMap
        this.squaddieMover = squaddieMover
        this.mapDisplay = mapDisplay
        this.phaseController = phaseController
        this.squaddieUsesActionOnSquaddie = squaddieUsesActionOnSquaddie
        this.playerHudController = playerHudController
        this.initializeBattle = initializeBattle

        this.resetInternalState()
    }

    private _previousUpdateTimestamp: number

    get previousUpdateTimestamp(): number {
        return this._previousUpdateTimestamp
    }

    private _battleComplete: boolean

    get battleComplete(): boolean {
        return this._battleComplete
    }

    private _uiControlSettings: UIControlSettings

    get uiControlSettings(): UIControlSettings {
        return this._uiControlSettings
    }

    recommendStateChanges(state: GameEngineState): GameEngineChanges {
        if (
            state.fileState.loadSaveState.userRequestedLoad &&
            !state.fileState.loadSaveState.applicationStartedLoad
        ) {
            return {
                nextMode: GameModeEnum.LOADING_BATTLE,
            }
        }

        return {
            nextMode: GameModeEnum.TITLE_SCREEN,
        }
    }

    public getCurrentComponent(): BattleOrchestratorComponent {
        switch (this.mode) {
            case BattleOrchestratorMode.INITIALIZED:
                return this.initializeBattle
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                return this.cutscenePlayer
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                return this.phaseController
            case BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR:
                return this.playerSquaddieSelector
            case BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET:
                return this.playerSquaddieTarget
            case BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR:
                return this.computerSquaddieSelector
            case BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP:
                return this.squaddieUsesActionOnMap
            case BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE:
                return this.squaddieUsesActionOnSquaddie
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                return this.squaddieMover
            case BattleOrchestratorMode.PLAYER_HUD_CONTROLLER:
                return this.playerHudController
            default:
                return this.defaultBattleOrchestrator
        }
    }

    public getCurrentMode(): BattleOrchestratorMode {
        return this.mode
    }

    public update(state: GameEngineState, graphicsContext: GraphicsBuffer) {
        if (state.fileState.loadSaveState.applicationStartedLoad) {
            return
        }

        if (this.uiControlSettings.displayBattleMap === true) {
            this.displayBattleMap(state, graphicsContext)
            BattleHUDService.draw(
                state.battleOrchestratorState.battleHUD,
                graphicsContext
            )
        }

        if (this.mode === BattleOrchestratorMode.PLAYER_HUD_CONTROLLER) {
            const orchestrationChanges: BattleOrchestratorChanges =
                this.playerHudController.recommendStateChanges(state)
            this.mode =
                orchestrationChanges.nextMode ||
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            this.playerHudController.reset(state)
        }

        switch (this.mode) {
            case BattleOrchestratorMode.INITIALIZED:
                this.updateComponent(
                    state,
                    this.initializeBattle,
                    graphicsContext,
                    BattleOrchestratorMode.CUTSCENE_PLAYER
                )
                break
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                this.updateComponent(
                    state,
                    this.cutscenePlayer,
                    graphicsContext,
                    BattleOrchestratorMode.PHASE_CONTROLLER
                )
                break
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                this.updateComponent(
                    state,
                    this.phaseController,
                    graphicsContext,
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
                break
            case BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR:
                this.updateComponent(
                    state,
                    this.playerSquaddieSelector,
                    graphicsContext,
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
                break
            case BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR:
                this.updateComponent(
                    state,
                    this.computerSquaddieSelector,
                    graphicsContext,
                    BattleOrchestratorMode.PHASE_CONTROLLER
                )
                break
            case BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP:
                this.updateComponent(
                    state,
                    this.squaddieUsesActionOnMap,
                    graphicsContext,
                    BattleOrchestratorMode.PHASE_CONTROLLER
                )
                break
            case BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE:
                this.updateComponent(
                    state,
                    this.squaddieUsesActionOnSquaddie,
                    graphicsContext,
                    BattleOrchestratorMode.PHASE_CONTROLLER
                )
                break
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateComponent(
                    state,
                    this.squaddieMover,
                    graphicsContext,
                    BattleOrchestratorMode.PHASE_CONTROLLER
                )
                break
            case BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET:
                this.updateComponent(
                    state,
                    this.playerSquaddieTarget,
                    graphicsContext,
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
                break
            default:
                break
        }

        if (
            !MissionStatisticsHandler.hasStarted(
                state.battleOrchestratorState.battleState.missionStatistics
            )
        ) {
            MissionStatisticsHandler.startRecording(
                state.battleOrchestratorState.battleState.missionStatistics
            )
        } else if (this.uiControlSettings.pauseTimer === false) {
            if (this.previousUpdateTimestamp != undefined) {
                MissionStatisticsHandler.addTimeElapsed(
                    state.battleOrchestratorState.battleState.missionStatistics,
                    Date.now() - this.previousUpdateTimestamp
                )
            }
            this._previousUpdateTimestamp = Date.now()
        }
    }

    public updateComponent(
        state: GameEngineState,
        currentComponent: BattleOrchestratorComponent,
        graphicsContext: GraphicsBuffer,
        defaultNextMode: BattleOrchestratorMode
    ) {
        currentComponent.update(state, graphicsContext)
        const newUIControlSettingsChanges =
            currentComponent.uiControlSettings(state)
        this.uiControlSettings.update(newUIControlSettingsChanges)

        if (currentComponent.hasCompleted(state)) {
            if (
                state.battleOrchestratorState.battleState
                    .battleCompletionStatus ===
                    BattleCompletionStatus.VICTORY ||
                state.battleOrchestratorState.battleState
                    .battleCompletionStatus === BattleCompletionStatus.DEFEAT
            ) {
                this._battleComplete = true
            }

            this.setNextComponentMode(state, currentComponent, defaultNextMode)

            currentComponent.reset(state)
        }
    }

    public mouseClicked(
        state: GameEngineState,
        mouseButton: MouseButton,
        mouseX: number,
        mouseY: number
    ) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton,
        }

        this.getCurrentComponent().mouseEventHappened(state, mouseEvent)

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent)
        }
    }

    public mouseMoved(state: GameEngineState, mouseX: number, mouseY: number) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.MOVED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.NONE,
        }

        this.getCurrentComponent().mouseEventHappened(state, mouseEvent)

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent)
        }
    }

    public keyPressed(state: GameEngineState, keyCode: number) {
        const keyEvent: OrchestratorComponentKeyEvent = {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode,
        }
        this.getCurrentComponent().keyEventHappened(state, keyEvent)

        if (this.uiControlSettings.displayBattleMap === true) {
            this.mapDisplay.keyEventHappened(state, keyEvent)
        }
    }

    hasCompleted(state: GameEngineState): boolean {
        return (
            this.battleComplete ||
            (state.fileState.loadSaveState.userRequestedLoad &&
                !(
                    state.fileState.loadSaveState.applicationStartedLoad ||
                    state.fileState.loadSaveState.applicationErroredWhileLoading
                ))
        )
    }

    reset(state: GameEngineState): void {
        ;[
            this.cutscenePlayer,
            this.playerSquaddieSelector,
            this.playerSquaddieTarget,
            this.computerSquaddieSelector,
            this.squaddieUsesActionOnMap,
            this.squaddieMover,
            this.mapDisplay,
            this.phaseController,
            this.squaddieUsesActionOnSquaddie,
        ]
            .filter((component: BattleOrchestratorComponent) => component)
            .forEach((component: BattleOrchestratorComponent) => {
                component.reset(state)
            })

        this.resetInternalState()
    }

    setup({}: {}): BattleOrchestratorState {
        return BattleOrchestratorStateService.newOrchestratorState({})
    }

    private setNextComponentMode(
        state: GameEngineState,
        currentComponent: BattleOrchestratorComponent,
        defaultNextMode: BattleOrchestratorMode
    ) {
        if (state.battleOrchestratorState.cutsceneIdsToPlay.length > 0) {
            const nextCutsceneId =
                state.battleOrchestratorState.cutsceneIdsToPlay[0]
            this.cutscenePlayer.startCutscene(nextCutsceneId, state)

            const nextCutscene =
                state.battleOrchestratorState.battleState.cutsceneTriggers.find(
                    (trigger) => trigger.cutsceneId === nextCutsceneId
                )
            if (nextCutscene) {
                nextCutscene.systemReactedToTrigger = true
            }
            this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER

            state.battleOrchestratorState.cutsceneIdsToPlay =
                state.battleOrchestratorState.cutsceneIdsToPlay.slice(1)
            return
        }

        const orchestrationChanges: BattleOrchestratorChanges =
            currentComponent.recommendStateChanges(state)
        let cutsceneTriggersToActivate =
            FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
                state,
                this.mode
            )

        if (orchestrationChanges.checkMissionObjectives === true) {
            let completionStatus: BattleCompletionStatus =
                this.checkMissionCompleteStatus(state)
            if (completionStatus) {
                state.battleOrchestratorState.battleState.battleCompletionStatus =
                    completionStatus
            }
        }

        if (
            state.fileState.loadSaveState.applicationStartedLoad === true &&
            state.battleOrchestratorState.battleState.battlePhaseState
                .turnCount === 0
        ) {
            cutsceneTriggersToActivate = cutsceneTriggersToActivate.filter(
                (cutsceneTrigger) =>
                    cutsceneTrigger.triggeringEvent !==
                        TriggeringEvent.START_OF_TURN ||
                    cutsceneTrigger.turn !== 0
            )
        }

        if (cutsceneTriggersToActivate.length > 0) {
            const nextCutscene = cutsceneTriggersToActivate[0]
            this.cutscenePlayer.startCutscene(nextCutscene.cutsceneId, state)
            nextCutscene.systemReactedToTrigger = true
            this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER
            return
        }

        this.mode = orchestrationChanges.nextMode || defaultNextMode
    }

    private checkMissionCompleteStatus(
        state: GameEngineState
    ): BattleCompletionStatus {
        const defeatObjectives =
            state.battleOrchestratorState.battleState.objectives.find(
                (objective: MissionObjective) =>
                    objective.reward.rewardType === MissionRewardType.DEFEAT &&
                    MissionObjectiveHelper.shouldBeComplete(objective, state) &&
                    !objective.hasGivenReward
            )
        if (defeatObjectives) {
            return BattleCompletionStatus.DEFEAT
        }

        const victoryObjectives =
            state.battleOrchestratorState.battleState.objectives.find(
                (objective: MissionObjective) =>
                    objective.reward.rewardType === MissionRewardType.VICTORY &&
                    MissionObjectiveHelper.shouldBeComplete(objective, state) &&
                    !objective.hasGivenReward
            )
        if (victoryObjectives) {
            return BattleCompletionStatus.VICTORY
        }

        return undefined
    }

    private displayBattleMap(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.mapDisplay.update(state, graphicsContext)
    }

    private resetInternalState() {
        this.mode = BattleOrchestratorMode.INITIALIZED
        this.defaultBattleOrchestrator = new DefaultBattleOrchestrator()
        this._uiControlSettings = new UIControlSettings({})

        this._battleComplete = false
        this._previousUpdateTimestamp = undefined
    }
}
