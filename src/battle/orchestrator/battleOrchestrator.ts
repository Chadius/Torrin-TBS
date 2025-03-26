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
import { BattlePlayerSquaddieTarget } from "../orchestratorComponents/playerActionTarget/battlePlayerSquaddieTarget"
import { BattleSquaddieUsesActionOnSquaddie } from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { UIControlSettings } from "./uiControlSettings"
import { BattleComputerSquaddieSelector } from "../orchestratorComponents/battleComputerSquaddieSelector"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../../gameEngine/gameEngineComponent"
import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { BattleCompletionStatus } from "./missionObjectivesAndCutscenes"
import { GameModeEnum } from "../../utils/startupConfig"
import { DefaultBattleOrchestrator } from "./defaultBattleOrchestrator"
import { MissionStatisticsService } from "../missionStatistics/missionStatistics"
import { CutsceneTrigger } from "../../cutscene/cutsceneTrigger"
import { InitializeBattle } from "./initializeBattle"
import { PlayerHudController } from "../orchestratorComponents/playerHudController"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattlePlayerActionConfirm } from "../orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import { MissionCutsceneService } from "../cutscene/missionCutsceneService"
import { CutsceneQueueService } from "../cutscene/cutsceneIdQueue"
import { PlayerDecisionHUDService } from "../hud/playerActionPanel/playerDecisionHUD"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { SquaddieSelectorPanelService } from "../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    PLAYER_HUD_CONTROLLER = "PLAYER_HUD_CONTROLLER",
    PLAYER_SQUADDIE_SELECTOR = "PLAYER_SQUADDIE_SELECTOR",
    PLAYER_SQUADDIE_TARGET = "PLAYER_SQUADDIE_TARGET",
    PLAYER_ACTION_CONFIRM = "PLAYER_ACTION_CONFIRM",
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
    playerActionConfirm: BattlePlayerActionConfirm

    constructor({
        cutscenePlayer,
        mapDisplay,
        phaseController,
        squaddieUsesActionOnMap,
        squaddieMover,
        squaddieUsesActionOnSquaddie,
        playerSquaddieSelector,
        playerSquaddieTarget,
        playerActionConfirm,
        computerSquaddieSelector,
        playerHudController,
        initializeBattle,
    }: {
        cutscenePlayer: BattleCutscenePlayer
        playerSquaddieSelector: BattlePlayerSquaddieSelector
        playerSquaddieTarget: BattlePlayerSquaddieTarget
        playerActionConfirm: BattlePlayerActionConfirm
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
        this.playerActionConfirm = playerActionConfirm
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
            case BattleOrchestratorMode.PLAYER_ACTION_CONFIRM:
                return this.playerActionConfirm
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

    public async update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        if (gameEngineState.fileState.loadSaveState.applicationStartedLoad) {
            return
        }
        this.displayMapAndPlayerHUD(gameEngineState, graphicsContext)

        if (this.mode === BattleOrchestratorMode.PLAYER_HUD_CONTROLLER) {
            const orchestrationChanges: BattleOrchestratorChanges =
                this.playerHudController.recommendStateChanges(gameEngineState)
            this.mode =
                orchestrationChanges.nextMode ||
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            this.playerHudController.reset(gameEngineState)
        }

        const modeUpdateComponentParameters: {
            [m in BattleOrchestratorMode]?: {
                currentComponent: BattleOrchestratorComponent
                defaultNextMode: BattleOrchestratorMode
            }
        } = {
            [BattleOrchestratorMode.INITIALIZED]: {
                currentComponent: this.initializeBattle,
                defaultNextMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
            },
            [BattleOrchestratorMode.CUTSCENE_PLAYER]: {
                currentComponent: this.cutscenePlayer,
                defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
            },
            [BattleOrchestratorMode.PHASE_CONTROLLER]: {
                currentComponent: this.phaseController,
                defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            [BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR]: {
                currentComponent: this.playerSquaddieSelector,
                defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            [BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR]: {
                currentComponent: this.computerSquaddieSelector,
                defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
            },
            [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP]: {
                currentComponent: this.squaddieUsesActionOnMap,
                defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
            },
            [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE]: {
                currentComponent: this.squaddieUsesActionOnSquaddie,
                defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
            },
            [BattleOrchestratorMode.SQUADDIE_MOVER]: {
                currentComponent: this.squaddieMover,
                defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
            },
            [BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET]: {
                currentComponent: this.playerSquaddieTarget,
                defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
            [BattleOrchestratorMode.PLAYER_ACTION_CONFIRM]: {
                currentComponent: this.playerActionConfirm,
                defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            },
        }

        if (this.mode in modeUpdateComponentParameters) {
            this.updateComponent(
                gameEngineState,
                modeUpdateComponentParameters[this.mode].currentComponent,
                graphicsContext,
                modeUpdateComponentParameters[this.mode].defaultNextMode
            )
        }

        if (
            !MissionStatisticsService.hasStarted(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics
            )
        ) {
            MissionStatisticsService.startRecording(
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics
            )
        } else if (this.uiControlSettings.pauseTimer === false) {
            if (this.previousUpdateTimestamp != undefined) {
                MissionStatisticsService.addTimeElapsed(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
                    Date.now() - this.previousUpdateTimestamp
                )
            }
            this._previousUpdateTimestamp = Date.now()
        }
    }

    private displayMapAndPlayerHUD(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        if (this.uiControlSettings.displayBattleMap !== true) return
        this.mapDisplay.update({
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        PlayerDecisionHUDService.draw(
            gameEngineState.battleOrchestratorState.playerDecisionHUD,
            graphicsContext
        )

        if (
            this.uiControlSettings.displayPlayerHUD === true &&
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        ) {
            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                graphicsBuffer: graphicsContext,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
            })
        }

        if (
            this.uiControlSettings.displayPlayerHUD === true &&
            gameEngineState.battleOrchestratorState.battleHUDState
                .squaddieSelectorPanel
        ) {
            SquaddieSelectorPanelService.draw({
                squaddieSelectorPanel:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .squaddieSelectorPanel,
                objectRepository: gameEngineState.repository,
                graphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
        }
    }

    public updateComponent(
        gameEngineState: GameEngineState,
        currentComponent: BattleOrchestratorComponent,
        graphicsContext: GraphicsBuffer,
        defaultNextMode: BattleOrchestratorMode
    ) {
        currentComponent.update({
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        const newUIControlSettingsChanges =
            currentComponent.uiControlSettings(gameEngineState)
        this.uiControlSettings.update(newUIControlSettingsChanges)

        if (currentComponent.hasCompleted(gameEngineState)) {
            if (
                gameEngineState.battleOrchestratorState.battleState
                    .battleCompletionStatus ===
                    BattleCompletionStatus.VICTORY ||
                gameEngineState.battleOrchestratorState.battleState
                    .battleCompletionStatus === BattleCompletionStatus.DEFEAT
            ) {
                this._battleComplete = true
            }

            this.setNextComponentMode(
                gameEngineState,
                currentComponent,
                defaultNextMode
            )

            currentComponent.reset(gameEngineState)
        }
    }

    public mouseReleased(
        gameEngineState: GameEngineState,
        mouseRelease: MouseRelease
    ): void {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease,
        }

        this.getCurrentComponent()?.mouseEventHappened(
            gameEngineState,
            mouseEvent
        )

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(gameEngineState, mouseEvent)
        }
    }

    public mousePressed(
        gameEngineState: GameEngineState,
        mousePress: MousePress
    ) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress,
        }

        this.getCurrentComponent()?.mouseEventHappened(
            gameEngineState,
            mouseEvent
        )

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(gameEngineState, mouseEvent)
        }
    }

    public mouseMoved(state: GameEngineState, mouseLocation: ScreenLocation) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.LOCATION,
            mouseLocation,
        }

        this.getCurrentComponent()?.mouseEventHappened(state, mouseEvent)

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent)
        }
    }

    mouseWheel(gameEngineState: GameEngineState, mouseWheel: MouseWheel): void {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.WHEEL,
            mouseWheel,
        }

        this.getCurrentComponent()?.mouseEventHappened(
            gameEngineState,
            mouseEvent
        )

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(gameEngineState, mouseEvent)
        }
    }

    mouseDragged(gameEngineState: GameEngineState, mouseDrag: MouseDrag): void {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.DRAG,
            mouseDrag,
        }

        this.getCurrentComponent()?.mouseEventHappened(
            gameEngineState,
            mouseEvent
        )

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(gameEngineState, mouseEvent)
        }
    }

    public keyPressed(gameEngineState: GameEngineState, keyCode: number) {
        const keyEvent: OrchestratorComponentKeyEvent = {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode,
        }
        this.getCurrentComponent()?.keyEventHappened(gameEngineState, keyEvent)

        if (this.uiControlSettings.displayBattleMap === true) {
            this.mapDisplay.keyEventHappened(gameEngineState, keyEvent)
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
            .filter(
                (battleOrchestratorComponent: BattleOrchestratorComponent) =>
                    battleOrchestratorComponent
            )
            .forEach(
                (battleOrchestratorComponent: BattleOrchestratorComponent) => {
                    battleOrchestratorComponent.reset(state)
                }
            )

        this.resetInternalState()
    }

    setup(): BattleOrchestratorState {
        return BattleOrchestratorStateService.new({})
    }

    private setNextComponentMode(
        gameEngineState: GameEngineState,
        currentComponent: BattleOrchestratorComponent,
        defaultNextMode: BattleOrchestratorMode
    ) {
        if (
            !CutsceneQueueService.isEmpty(
                gameEngineState.battleOrchestratorState.cutsceneQueue
            )
        ) {
            this.prepareToPlayNextTriggeredCutscene({
                cutsceneId: CutsceneQueueService.peek(
                    gameEngineState.battleOrchestratorState.cutsceneQueue
                ),
                cutsceneTrigger:
                    gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers.find(
                        (trigger) =>
                            trigger.cutsceneId ===
                            CutsceneQueueService.peek(
                                gameEngineState.battleOrchestratorState
                                    .cutsceneQueue
                            )
                    ),
                gameEngineState,
            })

            CutsceneQueueService.dequeue(
                gameEngineState.battleOrchestratorState.cutsceneQueue
            )
            return
        }

        const orchestrationChanges: BattleOrchestratorChanges =
            currentComponent.recommendStateChanges(gameEngineState)
        this.checkOnMissionCompletion(orchestrationChanges, gameEngineState)

        const cutsceneTriggersToActivate =
            this.getCutsceneTriggersToCalculate(gameEngineState)

        if (cutsceneTriggersToActivate.length > 0) {
            this.prepareToPlayNextTriggeredCutscene({
                cutsceneTrigger: cutsceneTriggersToActivate[0],
                cutsceneId: cutsceneTriggersToActivate[0].cutsceneId,
                gameEngineState,
            })
            return
        }

        this.mode = orchestrationChanges.nextMode || defaultNextMode
    }

    private checkOnMissionCompletion(
        orchestrationChanges: BattleOrchestratorChanges,
        gameEngineState: GameEngineState
    ) {
        if (orchestrationChanges.checkMissionObjectives === true) {
            let completionStatus: BattleCompletionStatus =
                this.checkMissionCompleteStatus(gameEngineState)
            if (completionStatus) {
                gameEngineState.battleOrchestratorState.battleState.battleCompletionStatus =
                    completionStatus
            }
        }
    }

    private getCutsceneTriggersToCalculate(gameEngineState: GameEngineState) {
        return [
            ...MissionCutsceneService.findCutsceneTriggersToActivateOnStartOfPhase(
                {
                    gameEngineState,
                    battleOrchestratorModeThatJustCompleted: this.mode,
                    ignoreTurn0Triggers:
                        gameEngineState.fileState.loadSaveState
                            .applicationStartedLoad === true &&
                        gameEngineState.battleOrchestratorState.battleState
                            .battlePhaseState.turnCount === 0,
                }
            ),
            ...MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
                gameEngineState,
                this.mode
            ),
        ]
    }

    private prepareToPlayNextTriggeredCutscene({
        cutsceneId,
        cutsceneTrigger,
        gameEngineState,
    }: {
        cutsceneId: string
        cutsceneTrigger: CutsceneTrigger
        gameEngineState: GameEngineState
    }) {
        this.cutscenePlayer.startCutscene(cutsceneId, gameEngineState)

        if (cutsceneTrigger !== undefined) {
            cutsceneTrigger.systemReactedToTrigger = true
        }

        this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER
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

    private resetInternalState() {
        this.mode = BattleOrchestratorMode.INITIALIZED
        this.defaultBattleOrchestrator = new DefaultBattleOrchestrator()
        this._uiControlSettings = new UIControlSettings({})

        this._battleComplete = false
        this._previousUpdateTimestamp = undefined
    }
}
