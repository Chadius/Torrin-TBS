import { GameModeEnum, TGameMode } from "../../utils/startupConfig"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../../battle/orchestrator/battleOrchestratorState"
import { ObjectRepository } from "../../battle/objectRepository"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    TitleScreenState,
    TitleScreenStateHelper,
} from "../../titleScreen/titleScreenState"
import { Campaign, CampaignService } from "../../campaign/campaign"
import {
    SaveSaveState,
    SaveSaveStateService,
} from "../../dataLoader/saveSaveState"
import {
    LoadSaveStateService,
    LoadState,
} from "../../dataLoader/playerData/loadState"
import { MessageBoard } from "../../message/messageBoard"
import {
    PlayerInputState,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

export interface GameEngineState {
    battleOrchestratorState: BattleOrchestratorState
    repository: ObjectRepository | undefined
    resourceHandler: ResourceHandler | undefined
    titleScreenState: TitleScreenState
    campaign: Campaign
    saveSaveState: SaveSaveState
    loadState: LoadState
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
        previousMode?: TGameMode
        campaign?: Campaign
        repository?: ObjectRepository
        playerInputState?: PlayerInputState
    }): GameEngineState => {
        return {
            battleOrchestratorState:
                battleOrchestratorState ??
                BattleOrchestratorStateService.new({}),
            titleScreenState: titleScreenState ?? TitleScreenStateHelper.new(),
            saveSaveState: SaveSaveStateService.new({}),
            loadState: LoadSaveStateService.new({
                modeThatInitiatedLoading: previousMode ?? GameModeEnum.UNKNOWN,
                campaignIdThatWasLoaded: campaign?.id,
            }),
            campaign: campaign ?? CampaignService.default(),
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
    clone: (original: GameEngineState | undefined): GameEngineState => {
        if (!original) {
            return GameEngineStateService.new({})
        }

        return {
            battleOrchestratorState: original.battleOrchestratorState,
            titleScreenState: original.titleScreenState,
            saveSaveState: original.saveSaveState,
            loadState: LoadSaveStateService.clone(original.loadState),
            campaign: original.campaign,
            repository: original.repository,
            resourceHandler: original.resourceHandler,
            messageBoard: original.messageBoard,
            playerInputState: original.playerInputState,
        }
    },
}
