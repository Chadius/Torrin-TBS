import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "./battleOrchestratorComponent"
import {
    BattleCache,
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "./battleOrchestratorState"
import { BattleCutscenePlayer } from "../orchestratorComponents/battleCutscenePlayer"
import { BattlePlayerSquaddieSelector } from "../orchestratorComponents/battlePlayerSquaddieSelector"
import { BattleSquaddieMover } from "../orchestratorComponents/battleSquaddieMover"
import { BattleMapDisplay } from "../orchestratorComponents/battleMapDisplay"
import { BattlePhaseController } from "../orchestratorComponents/battlePhaseController"
import { BattleSquaddieUsesActionOnMap } from "../orchestratorComponents/battleSquaddieUsesActionOnMap"
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
    MissionObjectiveService,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { BattleCompletionStatus } from "./missionObjectivesAndCutscenes"
import { GameModeEnum } from "../../utils/startupConfig"
import { DefaultBattleOrchestrator } from "./defaultBattleOrchestrator"
import { MissionStatisticsService } from "../missionStatistics/missionStatistics"
import { BattleEvent } from "../event/battleEvent"
import { InitializeBattle } from "./initializeBattle"
import { PlayerHudController } from "../orchestratorComponents/playerHudController"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    CutsceneIdQueue,
    CutsceneQueueService,
} from "../cutscene/cutsceneIdQueue"
import { PlayerDecisionHUDService } from "../hud/playerActionPanel/playerDecisionHUD"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { SquaddieSelectorPanelService } from "../hud/playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { PlayerActionTargetSelect } from "../orchestratorComponents/playerActionTargetSelect/playerActionTargetSelect"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { ActionSelectedTileService } from "../hud/playerActionPanel/tile/actionSelectedTile/actionSelectedTile"
import { SquaddieNameAndPortraitTileService } from "../hud/playerActionPanel/tile/squaddieNameAndPortraitTile"
import { DebugModeMenuService } from "../hud/debugModeMenu/debugModeMenu"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleEventEffectType } from "../event/battleEventEffect"
import { BattleEventMessageListener } from "../event/battleEventMessageListener"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"
import { ChallengeModifierSetting } from "../challengeModifier/challengeModifierSetting"

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    PLAYER_HUD_CONTROLLER = "PLAYER_HUD_CONTROLLER",
    PLAYER_SQUADDIE_SELECTOR = "PLAYER_SQUADDIE_SELECTOR",
    PLAYER_ACTION_TARGET_SELECT = "PLAYER_ACTION_TARGET_SELECT",
    COMPUTER_SQUADDIE_SELECTOR = "COMPUTER_SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
    SQUADDIE_USES_ACTION_ON_MAP = "SQUADDIE_USES_ACTION_ON_MAP",
    SQUADDIE_USES_ACTION_ON_SQUADDIE = "SQUADDIE_USES_ACTION_ON_SQUADDIE",
}

export class BattleOrchestrator implements GameEngineComponent {
    mode: BattleOrchestratorMode

    cutscenePlayer: BattleCutscenePlayer
    playerSquaddieSelector: BattlePlayerSquaddieSelector
    playerActionTargetSelect: PlayerActionTargetSelect
    computerSquaddieSelector: BattleComputerSquaddieSelector
    squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
    squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
    squaddieMover: BattleSquaddieMover
    defaultBattleOrchestrator: DefaultBattleOrchestrator
    mapDisplay: BattleMapDisplay
    phaseController: BattlePhaseController
    initializeBattle: InitializeBattle
    playerHudController: PlayerHudController
    battleEventMessageListener: BattleEventMessageListener

    battleOrchestratorModeComponentConstants: {
        [m in BattleOrchestratorMode]: {
            getCurrentComponent: () => BattleOrchestratorComponent
            defaultNextMode: BattleOrchestratorMode
        }
    } = {
        [BattleOrchestratorMode.INITIALIZED]: {
            getCurrentComponent: () => {
                return this.initializeBattle
            },
            defaultNextMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        },
        [BattleOrchestratorMode.CUTSCENE_PLAYER]: {
            getCurrentComponent: () => {
                return this.cutscenePlayer
            },
            defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        },
        [BattleOrchestratorMode.PHASE_CONTROLLER]: {
            getCurrentComponent: () => {
                return this.phaseController
            },
            defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        },
        [BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR]: {
            getCurrentComponent: () => {
                return this.playerSquaddieSelector
            },
            defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        },
        [BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR]: {
            getCurrentComponent: () => {
                return this.computerSquaddieSelector
            },
            defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        },
        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP]: {
            getCurrentComponent: () => {
                return this.squaddieUsesActionOnMap
            },
            defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        },
        [BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE]: {
            getCurrentComponent: () => {
                return this.squaddieUsesActionOnSquaddie
            },
            defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        },
        [BattleOrchestratorMode.SQUADDIE_MOVER]: {
            getCurrentComponent: () => {
                return this.squaddieMover
            },
            defaultNextMode: BattleOrchestratorMode.PHASE_CONTROLLER,
        },
        [BattleOrchestratorMode.PLAYER_ACTION_TARGET_SELECT]: {
            getCurrentComponent: () => {
                return this.playerActionTargetSelect
            },
            defaultNextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        },
        [BattleOrchestratorMode.PLAYER_HUD_CONTROLLER]: {
            getCurrentComponent: () => this.playerHudController,
            defaultNextMode: undefined,
        },
        [BattleOrchestratorMode.UNKNOWN]: {
            getCurrentComponent: () => this.defaultBattleOrchestrator,
            defaultNextMode: BattleOrchestratorMode.INITIALIZED,
        },
    }

    constructor({
        cutscenePlayer,
        mapDisplay,
        phaseController,
        squaddieUsesActionOnMap,
        squaddieMover,
        squaddieUsesActionOnSquaddie,
        playerSquaddieSelector,
        playerActionTargetSelect,
        computerSquaddieSelector,
        playerHudController,
        initializeBattle,
        battleEventMessageListener,
    }: {
        cutscenePlayer: BattleCutscenePlayer
        playerSquaddieSelector: BattlePlayerSquaddieSelector
        playerActionTargetSelect: PlayerActionTargetSelect
        computerSquaddieSelector: BattleComputerSquaddieSelector
        squaddieUsesActionOnMap: BattleSquaddieUsesActionOnMap
        squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
        squaddieMover: BattleSquaddieMover
        mapDisplay: BattleMapDisplay
        phaseController: BattlePhaseController
        playerHudController: PlayerHudController
        initializeBattle: InitializeBattle
        battleEventMessageListener: BattleEventMessageListener
    }) {
        this.cutscenePlayer = cutscenePlayer
        this.playerSquaddieSelector = playerSquaddieSelector
        this.computerSquaddieSelector = computerSquaddieSelector
        this.squaddieUsesActionOnMap = squaddieUsesActionOnMap
        this.squaddieMover = squaddieMover
        this.mapDisplay = mapDisplay
        this.phaseController = phaseController
        this.squaddieUsesActionOnSquaddie = squaddieUsesActionOnSquaddie
        this.playerHudController = playerHudController
        this.initializeBattle = initializeBattle

        this.playerActionTargetSelect = playerActionTargetSelect
        this.battleEventMessageListener = battleEventMessageListener

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
        return (
            this.battleOrchestratorModeComponentConstants[
                this.mode
            ].getCurrentComponent() ?? this.defaultBattleOrchestrator
        )
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
        this.initializeCache({
            cache: gameEngineState.battleOrchestratorState.cache,
        })

        this.setUpBattleEventMessageListener({
            challengeModifierSetting:
                gameEngineState.battleOrchestratorState.battleState
                    .challengeModifierSetting,
            cutsceneQueue:
                gameEngineState.battleOrchestratorState.cutsceneQueue,
        })

        this.displayMapAndPlayerHUD(gameEngineState, graphicsContext)

        if (this.mode === BattleOrchestratorMode.PLAYER_HUD_CONTROLLER) {
            const orchestrationChanges: BattleOrchestratorChanges =
                this.playerHudController.recommendStateChanges(gameEngineState)
            this.mode =
                orchestrationChanges.nextMode ||
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            this.playerHudController.reset(gameEngineState)
        }

        if (this.mode in this.battleOrchestratorModeComponentConstants) {
            this.updateComponent(
                gameEngineState,
                this.battleOrchestratorModeComponentConstants[
                    this.mode
                ].getCurrentComponent(),
                graphicsContext,
                this.battleOrchestratorModeComponentConstants[this.mode]
                    .defaultNextMode
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

        this.drawDebugMenu(gameEngineState, graphicsContext)
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

        PlayerDecisionHUDService.drawPopupWindows(
            gameEngineState.battleOrchestratorState.playerDecisionHUD,
            graphicsContext
        )
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

        if (gameEngineState.battleOrchestratorState.battleHUD.debugMode) {
            DebugModeMenuService.mouseReleased({
                debugModeMenu:
                    gameEngineState.battleOrchestratorState.battleHUD.debugMode,
                mouseRelease,
            })
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
        if (gameEngineState.battleOrchestratorState.battleHUD.debugMode) {
            DebugModeMenuService.mousePressed({
                debugModeMenu:
                    gameEngineState.battleOrchestratorState.battleHUD.debugMode,
                mousePress,
            })
        }
    }

    public mouseMoved(
        gameEngineState: GameEngineState,
        mouseLocation: ScreenLocation
    ) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.LOCATION,
            mouseLocation,
        }

        this.getCurrentComponent()?.mouseEventHappened(
            gameEngineState,
            mouseEvent
        )

        if (this.uiControlSettings.letMouseScrollCamera === true) {
            this.mapDisplay.mouseEventHappened(gameEngineState, mouseEvent)
        }
        if (this.uiControlSettings.displayPlayerHUD === true) {
            Object.values(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles
            )
                .filter((x) => x)
                .forEach((squaddieNameTile) => {
                    SquaddieNameAndPortraitTileService.mouseMoved({
                        tile: squaddieNameTile,
                        mouseLocation,
                    })
                })
            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.actionSelectedTile != undefined
            ) {
                ActionSelectedTileService.mouseMoved({
                    tile: gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.actionSelectedTile,
                    mouseLocation,
                })
            }
        }
        if (gameEngineState.battleOrchestratorState.battleHUD.debugMode) {
            DebugModeMenuService.mouseMoved({
                debugModeMenu:
                    gameEngineState.battleOrchestratorState.battleHUD.debugMode,
                mouseLocation,
            })
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
            const cutsceneId = CutsceneQueueService.dequeue(
                gameEngineState.battleOrchestratorState.cutsceneQueue
            )

            this.prepareToPlayNextTriggeredCutscene({
                cutsceneId,
                gameEngineState,
            })
            return
        }

        const orchestrationChanges: BattleOrchestratorChanges =
            currentComponent.recommendStateChanges(gameEngineState)
        this.checkOnMissionCompletion(orchestrationChanges, gameEngineState)

        const checkForBattleEvents = [
            BattleOrchestratorMode.INITIALIZED,
            BattleOrchestratorMode.PHASE_CONTROLLER,
            BattleOrchestratorMode.SQUADDIE_MOVER,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
        ].includes(this.mode)

        this.mode = orchestrationChanges.nextMode || defaultNextMode

        if (!checkForBattleEvents) return

        const battleEventsToActivate =
            this.getBattleEventsToActivate(gameEngineState)

        this.battleEventMessageListener.applyBattleEventEffects(
            battleEventsToActivate
        )

        const cutsceneBattleEvents = battleEventsToActivate
            .filter(
                (battleEvent) =>
                    battleEvent.effect.type === BattleEventEffectType.CUTSCENE
            )
            .map(
                (battleEvent) =>
                    battleEvent as BattleEvent & { effect: CutsceneEffect }
            )

        if (cutsceneBattleEvents.length > 0) {
            this.prepareToPlayNextTriggeredCutscene({
                battleEvent: cutsceneBattleEvents[0],
                gameEngineState,
            })
        }
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

    private getBattleEventsToActivate(
        gameEngineState: GameEngineState
    ): BattleEvent[] {
        return this.battleEventMessageListener.filterQualifyingBattleEvents({
            allBattleEvents:
                gameEngineState.battleOrchestratorState.battleState
                    .battleEvents,
            objectRepository: gameEngineState.repository,
            battleCompletionStatus:
                gameEngineState.battleOrchestratorState.battleState
                    .battleCompletionStatus,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            turn: {
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState.turnCount,
                ignoreTurn0:
                    gameEngineState.fileState.loadSaveState
                        .applicationStartedLoad === true &&
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState.turnCount === 0,
            },
        })
    }

    private prepareToPlayNextTriggeredCutscene({
        cutsceneId,
        gameEngineState,
        battleEvent,
    }: {
        cutsceneId?: string
        gameEngineState: GameEngineState
        battleEvent?: BattleEvent & { effect: CutsceneEffect }
    }) {
        const cutsceneIdToPlay = battleEvent
            ? battleEvent.effect.cutsceneId
            : cutsceneId
        if (!cutsceneIdToPlay) {
            throw new Error("No cutsceneId was found.")
        }

        this.cutscenePlayer.startCutscene(cutsceneIdToPlay, gameEngineState)

        if (!battleEvent) {
            battleEvent =
                gameEngineState.battleOrchestratorState.battleState.battleEvents
                    .filter(
                        (battleEvent) =>
                            battleEvent.effect.type ===
                            BattleEventEffectType.CUTSCENE
                    )
                    .find((battleEvent) => {
                        return (
                            (battleEvent as { effect: CutsceneEffect }).effect
                                .cutsceneId === cutsceneId
                        )
                    }) as BattleEvent & { effect: CutsceneEffect }
        }

        if (battleEvent) {
            battleEvent.effect.alreadyAppliedEffect = true
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
                    MissionObjectiveService.shouldBeComplete(
                        objective,
                        state
                    ) &&
                    !objective.hasGivenReward
            )
        if (defeatObjectives) {
            return BattleCompletionStatus.DEFEAT
        }

        const victoryObjectives =
            state.battleOrchestratorState.battleState.objectives.find(
                (objective: MissionObjective) =>
                    objective.reward.rewardType === MissionRewardType.VICTORY &&
                    MissionObjectiveService.shouldBeComplete(
                        objective,
                        state
                    ) &&
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

    private initializeCache({ cache }: { cache: BattleCache }) {
        if (cache.searchResultsCache == undefined) {
            cache.searchResultsCache = SearchResultsCacheService.new()
        }
    }

    private drawDebugMenu(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        if (
            !isValidValue(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            )
        )
            return
        DebugModeMenuService.draw({
            debugModeMenu:
                gameEngineState.battleOrchestratorState.battleHUD.debugMode,
            graphicsContext,
        })
    }

    private setUpBattleEventMessageListener({
        challengeModifierSetting,
        cutsceneQueue,
    }: {
        challengeModifierSetting: ChallengeModifierSetting
        cutsceneQueue: CutsceneIdQueue
    }) {
        this.battleEventMessageListener.setChallengeModifierSetting(
            challengeModifierSetting
        )
        this.battleEventMessageListener.setCutsceneQueue(cutsceneQueue)
    }
}
