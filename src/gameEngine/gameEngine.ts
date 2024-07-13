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
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { BattleSquaddieUsesActionOnSquaddie } from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { MouseButton } from "../utils/mouseConfig"
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
import { SAVE_VERSION } from "../utils/fileHandling/saveFile"
import { GameEngineGameLoader } from "./gameEngineGameLoader"
import { InitializeBattle } from "../battle/orchestrator/initializeBattle"
import { Campaign } from "../campaign/campaign"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { isValidValue } from "../utils/validityCheck"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { FileState, FileStateService } from "./fileState"
import { MessageBoard } from "../message/messageBoard"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { PlayerHudController } from "../battle/orchestratorComponents/playerHudController"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { CutsceneMessageListener } from "../battle/cutscene/missionCutsceneService"
import { BattleStateListener } from "../battle/orchestrator/battleState"

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
        battleOrchestratorState?: BattleOrchestratorState
        titleScreenState?: TitleScreenState
        resourceHandler?: ResourceHandler
        previousMode?: GameModeEnum
        campaign?: Campaign
        repository?: ObjectRepository
    }): GameEngineState => {
        return {
            modeThatInitiatedLoading: previousMode ?? GameModeEnum.UNKNOWN,
            battleOrchestratorState:
                battleOrchestratorState ??
                BattleOrchestratorStateService.new({}),
            titleScreenState: titleScreenState ?? TitleScreenStateHelper.new(),
            fileState: FileStateService.new({}),
            campaign,
            campaignIdThatWasLoaded: isValidValue(campaign)
                ? campaign.id
                : undefined,
            repository,
            resourceHandler,
            messageBoard: new MessageBoard(),
        }
    },
}

export class GameEngine {
    gameEngineState: GameEngineState
    gameEngineGameLoader: GameEngineGameLoader
    graphicsBuffer: GraphicsBuffer

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

    get component(): GameEngineComponent {
        switch (this.currentMode) {
            case GameModeEnum.TITLE_SCREEN:
                return this.titleScreen
            case GameModeEnum.LOADING_BATTLE:
                return this.gameEngineGameLoader
            case GameModeEnum.BATTLE:
                return this.battleOrchestrator
            default:
                throw new Error(
                    `Cannot find component for Game Engine mode ${this.currentMode}`
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
    }: {
        graphicsBuffer: GraphicsBuffer
        campaignId: string
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
            playerSquaddieTarget: new BattlePlayerSquaddieTarget(),
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
            resourceHandler: this.resourceHandler,
        })
        this.gameEngineGameLoader = new GameEngineGameLoader(campaignId)
        this.resetComponentStates()
    }

    async draw() {
        await this.update({ graphics: this.graphicsBuffer })
    }

    keyPressed(keyCode: number) {
        this.component.keyPressed(this.gameEngineState, keyCode)
    }

    mouseClicked(mouseButton: MouseButton, mouseX: number, mouseY: number) {
        this.component.mouseClicked(
            this.gameEngineState,
            mouseButton,
            mouseX,
            mouseY
        )
    }

    mouseMoved(mouseX: number, mouseY: number) {
        this.component.mouseMoved(this.gameEngineState, mouseX, mouseY)
    }

    async update({ graphics }: { graphics: GraphicsBuffer }) {
        if (!isValidValue(this.component)) {
            return
        }
        this.component.update(this.gameEngineState, graphics)

        if (this.gameEngineState.fileState.saveSaveState.savingInProgress) {
            this.saveGameAndDownloadFile()
        }

        if (this.component.hasCompleted(this.gameEngineState)) {
            const orchestrationChanges: GameEngineChanges =
                this.component.recommendStateChanges(this.gameEngineState)
            if (
                !(
                    orchestrationChanges.nextMode ===
                        GameModeEnum.LOADING_BATTLE &&
                    this.currentMode === GameModeEnum.BATTLE
                )
            ) {
                this.component.reset(this.gameEngineState)
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
            battleOrchestratorState: this.battleOrchestrator.setup({}),
            titleScreenState: this.titleScreen.setup(),
            repository: ObjectRepositoryService.new(),
            resourceHandler: this.resourceHandler,
            campaign: undefined,
        })
        const battleHUDListener: BattleHUDListener = new BattleHUDListener(
            "battleHUDListener"
        )
        ;[
            MessageBoardMessageType.STARTED_PLAYER_PHASE,
            MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
            MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE,
            MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
            MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
            MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
            MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
            MessageBoardMessageType.PLAYER_ENDS_TURN,
        ].forEach((messageBoardMessageType) => {
            this.gameEngineState.messageBoard.addListener(
                battleHUDListener,
                messageBoardMessageType
            )
        })
        const battleStateListener: BattleStateListener =
            new BattleStateListener("battleStateListener")
        ;[MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION].forEach(
            (messageBoardMessageType) => {
                this.gameEngineState.messageBoard.addListener(
                    battleStateListener,
                    messageBoardMessageType
                )
            }
        )

        const cutsceneMessageListener = new CutsceneMessageListener(
            "cutsceneMessageListener"
        )
        this.gameEngineState.messageBoard.addListener(
            cutsceneMessageListener,
            MessageBoardMessageType.SQUADDIE_IS_INJURED
        )
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
                saveVersion: SAVE_VERSION,
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
