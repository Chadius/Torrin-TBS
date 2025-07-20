import p5 from "p5"
import { BattleOrchestrator } from "../battle/orchestrator/battleOrchestrator"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../battle/orchestrator/battleOrchestratorState"
import { BattleCutscenePlayer } from "../battle/orchestratorComponents/battleCutscenePlayer"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { BattleComputerSquaddieSelector } from "../battle/orchestratorComponents/battleComputerSquaddieSelector"
import { BattleSquaddieUsesActionOnMap } from "../battle/orchestratorComponents/battleSquaddieUsesActionOnMap"
import { BattleSquaddieMover } from "../battle/orchestratorComponents/battleSquaddieMover"
import { BattleMapDisplay } from "../battle/orchestratorComponents/battleMapDisplay"
import { BattlePhaseController } from "../battle/orchestratorComponents/battlePhaseController"
import { BattleSquaddieUsesActionOnSquaddie } from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../utils/mouseConfig"
import { GameModeEnum } from "../utils/startupConfig"
import { GameEngineChanges, GameEngineComponent } from "./gameEngineComponent"
import { TitleScreen } from "../titleScreen/titleScreen"
import {
    TitleScreenState,
    TitleScreenStateHelper,
} from "../titleScreen/titleScreenState"
import {
    ResourceHandler,
    ResourceHandlerService,
} from "../resource/resourceHandler"
import {
    BattleSaveState,
    BattleSaveStateService,
} from "../battle/history/battleSaveState"
import { GameEngineGameLoader } from "./gameEngineGameLoader"
import { InitializeBattle } from "../battle/orchestrator/initializeBattle"
import { Campaign } from "../campaign/campaign"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { isValidValue } from "../utils/objectValidityCheck"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { FileState, FileStateService } from "./fileState"
import { MessageBoard } from "../message/messageBoard"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { PlayerHudController } from "../battle/orchestratorComponents/playerHudController"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { CutsceneMessageListener } from "../battle/cutscene/missionCutsceneService"
import { BattleStateListener } from "../battle/battleState/battleState"
import { SquaddiePhaseListener } from "../battle/startOfPhase/squaddiePhaseListener"
import { PlayerDecisionHUDListener } from "../battle/hud/playerActionPanel/playerDecisionHUD"
import {
    PlayerInputState,
    PlayerInputStateService,
} from "../ui/playerInput/playerInputState"
import { PlayerDataMessageListener } from "../dataLoader/playerData/playerDataMessageListener"
import { BattleHUDListener } from "../battle/hud/battleHUD/battleHUDListener"
import { PlayerActionTargetSelect } from "../battle/orchestratorComponents/playerActionTargetSelect/playerActionTargetSelect"

export interface GameEngineState {
    modeThatInitiatedLoading: GameModeEnum
    battleOrchestratorState: BattleOrchestratorState
    repository: ObjectRepository
    resourceHandler: ResourceHandler
    titleScreenState: TitleScreenState
    campaign: Campaign
    campaignIdThatWasLoaded: string
    fileState: FileState
    messageBoard: MessageBoard
    playerInputState: PlayerInputState
}

export const GameEngineStateService = {
    new: ({
        battleOrchestratorState,
        titleScreenState,
        resourceHandler,
        previousMode,
        repository,
        campaign,
        playerInputState,
    }: {
        battleOrchestratorState?: BattleOrchestratorState
        titleScreenState?: TitleScreenState
        resourceHandler?: ResourceHandler
        previousMode?: GameModeEnum
        campaign?: Campaign
        repository?: ObjectRepository
        playerInputState?: PlayerInputState
    }): GameEngineState => {
        return {
            modeThatInitiatedLoading: previousMode ?? GameModeEnum.UNKNOWN,
            battleOrchestratorState:
                battleOrchestratorState ??
                BattleOrchestratorStateService.new({}),
            titleScreenState: titleScreenState ?? TitleScreenStateHelper.new(),
            fileState: FileStateService.new(),
            campaign,
            campaignIdThatWasLoaded: isValidValue(campaign)
                ? campaign.id
                : undefined,
            repository,
            resourceHandler,
            messageBoard: new MessageBoard({
                logMessages: process.env.LOG_MESSAGES === "true",
            }),
            playerInputState:
                playerInputState ??
                PlayerInputStateService.newFromEnvironment(),
        }
    },
}

export class GameEngine {
    gameEngineState: GameEngineState
    gameEngineGameLoader: GameEngineGameLoader
    graphicsBuffer: GraphicsBuffer
    version: string

    constructor({
        graphicsBuffer,
        startupMode,
    }: {
        graphicsBuffer: GraphicsBuffer
        startupMode: GameModeEnum
    }) {
        this.graphicsBuffer = graphicsBuffer
        this._currentMode = startupMode
    }

    private _titleScreen: TitleScreen

    get titleScreen(): TitleScreen {
        return this._titleScreen
    }

    get gameEngineComponent(): GameEngineComponent {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreen
            case GameModeEnum.LOADING_BATTLE:
                return this.gameEngineGameLoader
            case GameModeEnum.BATTLE:
                return this.battleOrchestrator
            default:
                throw new Error(
                    `Cannot find game engine component for ${this.currentMode}`
                )
        }
    }

    private _currentMode: GameModeEnum

    get currentMode(): GameModeEnum {
        return this._currentMode
    }

    private _battleOrchestrator: BattleOrchestrator

    get battleOrchestrator(): BattleOrchestrator {
        return this._battleOrchestrator
    }

    private _resourceHandler: ResourceHandler

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler
    }

    async setup({
        graphicsBuffer,
        campaignId,
        p5Instance,
        version,
    }: {
        graphicsBuffer: GraphicsBuffer
        campaignId: string
        version: string
        p5Instance?: p5
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
            playerActionTargetSelect: new PlayerActionTargetSelect(),
            squaddieUsesActionOnSquaddie:
                new BattleSquaddieUsesActionOnSquaddie(),
            playerHudController: new PlayerHudController(),
        })

        await this.lazyLoadResourceHandler({
            graphicsBuffer: graphicsBuffer,
            campaignId,
            p5Instance,
        })

        this._titleScreen = new TitleScreen({
            version,
            p5Instance,
        })
        this.gameEngineGameLoader = new GameEngineGameLoader(
            process.env.CAMPAIGN_ID
        )
        this.version = version
        this.resetComponentStates()
    }

    async draw() {
        await this.update({ graphics: this.graphicsBuffer })
    }

    keyPressed(keyCode: number) {
        this.gameEngineComponent?.keyPressed(this.gameEngineState, keyCode)
    }

    keyIsDown(keyCode: number) {
        if (!this.gameEngineState) return
        PlayerInputStateService.keyIsDown(
            this.gameEngineState.playerInputState,
            keyCode
        )
    }

    keyIsUp(keyCode: number) {
        if (!this.gameEngineState) return
        PlayerInputStateService.keyIsUp(
            this.gameEngineState.playerInputState,
            keyCode
        )
    }

    mousePressed(mousePress: MousePress) {
        this.gameEngineComponent?.mousePressed(this.gameEngineState, mousePress)
    }

    mouseReleased(mouseRelease: MouseRelease) {
        this.gameEngineComponent?.mouseReleased(
            this.gameEngineState,
            mouseRelease
        )
    }

    mouseMoved(mouseLocation: ScreenLocation) {
        this.gameEngineComponent?.mouseMoved(
            this.gameEngineState,
            mouseLocation
        )
    }

    mouseWheel(mouseWheel: MouseWheel) {
        this.gameEngineComponent?.mouseWheel(this.gameEngineState, mouseWheel)
    }

    mouseDragged(mouseDrag: MouseDrag) {
        this.gameEngineComponent?.mouseDragged(this.gameEngineState, mouseDrag)
    }

    async update({ graphics }: { graphics: GraphicsBuffer }) {
        if (!isValidValue(this.gameEngineComponent)) {
            return
        }
        await this.gameEngineComponent.update(this.gameEngineState, graphics)

        if (this.gameEngineState.fileState.saveSaveState.savingInProgress) {
            this.saveGameAndDownloadFile()
        }

        if (this.gameEngineComponent.hasCompleted(this.gameEngineState)) {
            const orchestrationChanges: GameEngineChanges =
                this.gameEngineComponent.recommendStateChanges(
                    this.gameEngineState
                )
            if (
                !(
                    orchestrationChanges.nextMode ===
                        GameModeEnum.LOADING_BATTLE &&
                    this.currentMode === GameModeEnum.BATTLE
                )
            ) {
                this.gameEngineComponent.reset(this.gameEngineState)
            }

            if (orchestrationChanges.nextMode === GameModeEnum.LOADING_BATTLE) {
                this.gameEngineState.modeThatInitiatedLoading = this.currentMode
            }

            this._currentMode =
                orchestrationChanges.nextMode || GameModeEnum.TITLE_SCREEN
            if (this.currentMode === GameModeEnum.TITLE_SCREEN) {
                this.gameEngineState.titleScreenState =
                    TitleScreenStateHelper.new()
            }
        }
    }

    private resetComponentStates() {
        this.gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: this.battleOrchestrator.setup(),
            titleScreenState: this.titleScreen.setup(),
            repository: ObjectRepositoryService.new(),
            resourceHandler: this.resourceHandler,
            campaign: undefined,
        })
        this.addMessageListeners()
    }

    private addMessageListeners() {
        const battleHUDListener: BattleHUDListener = new BattleHUDListener(
            "battleHUDListener"
        )

        ;[
            MessageBoardMessageType.STARTED_PLAYER_PHASE,
            MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
            MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
            MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
            MessageBoardMessageType.PLAYER_ENDS_TURN,
            MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE,
            MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
            MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
            MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
            MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                battleHUDListener,
                messageBoardMessageType
            )
        })

        const squaddiePhaseListener = new SquaddiePhaseListener(
            "squaddiePhaseListener"
        )
        ;[
            MessageBoardMessageType.STARTED_PLAYER_PHASE,
            MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                squaddiePhaseListener,
                messageBoardMessageType
            )
        })

        const battleStateListener: BattleStateListener =
            new BattleStateListener("battleStateListener")
        ;[
            MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            MessageBoardMessageType.SQUADDIE_TURN_ENDS,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                battleStateListener,
                messageBoardMessageType
            )
        })

        const cutsceneMessageListener = new CutsceneMessageListener(
            "cutsceneMessageListener"
        )

        ;[
            MessageBoardMessageType.SQUADDIE_IS_INJURED,
            MessageBoardMessageType.SQUADDIE_IS_DEFEATED,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                cutsceneMessageListener,
                messageBoardMessageType
            )
        })

        this.gameEngineState.messageBoard.addListener(
            this._battleOrchestrator.playerSquaddieSelector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        const playerDecisionHUDListener = new PlayerDecisionHUDListener(
            "playerDecisionHUDListener"
        )
        ;[
            MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
            MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
            MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
            MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT,
            MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                playerDecisionHUDListener,
                messageBoardMessageType
            )
        })

        const playerDataMessageListener = new PlayerDataMessageListener(
            "playerDataMessageListener"
        )
        ;[
            MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
            MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN,
            MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
            MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE,
            MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD,
            MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                playerDataMessageListener,
                messageBoardMessageType
            )
        })
    }

    private async lazyLoadResourceHandler({
        graphicsBuffer,
        campaignId,
        p5Instance,
    }: {
        graphicsBuffer: GraphicsBuffer
        campaignId: string
        p5Instance?: p5
    }) {
        if (this.resourceHandler === undefined) {
            this._resourceHandler = ResourceHandlerService.new({
                graphics: graphicsBuffer,
                resourceLocators: [],
                imageLoader: undefined,
                p5Instance,
            })

            const resourceLocationsFilename = `assets/campaign/${campaignId}/resourceLocators.json`
            try {
                await ResourceHandlerService.loadResourceLocations(
                    this._resourceHandler,
                    resourceLocationsFilename
                )
            } catch (e) {
                console.error(
                    `Failed to load resource locations in file: ${resourceLocationsFilename}`
                )
                console.error(e)
                throw e
            }
        }

        return this.resourceHandler
    }

    private saveGameAndDownloadFile() {
        const saveData: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                saveVersion: this.version,
                missionId:
                    this.gameEngineState.battleOrchestratorState.battleState
                        .missionId,
                campaignId: this.gameEngineState.campaign.id,
                battleOrchestratorState:
                    this.gameEngineState.battleOrchestratorState,
                repository: this.gameEngineState.repository,
            })
        try {
            BattleSaveStateService.SaveToFile(saveData)
        } catch (error) {
            console.log(`Save game failed: ${error}`)
            this.gameEngineState.fileState.saveSaveState.errorDuringSaving =
                true
            SaveSaveStateService.foundErrorDuringSaving(
                this.gameEngineState.fileState.saveSaveState
            )
        }
        SaveSaveStateService.savingAttemptIsComplete(
            this.gameEngineState.fileState.saveSaveState
        )
    }
}
