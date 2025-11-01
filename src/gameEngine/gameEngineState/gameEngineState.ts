import { GameModeEnum, TGameMode } from "../../utils/startupConfig"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../../battle/orchestrator/battleOrchestratorState"
import { ObjectRepository } from "../../battle/objectRepository"
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
import { ResourceRepository } from "../../resource/resourceRepository.ts"

export interface GameEngineState {
    battleOrchestratorState: BattleOrchestratorState
    repository: ObjectRepository | undefined
    resourceRepository: ResourceRepository | undefined
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
        previousMode,
        repository,
        campaign,
        playerInputState,
        resourceRepository,
    }: {
        battleOrchestratorState?: BattleOrchestratorState
        titleScreenState?: TitleScreenState
        resourceRepository?: ResourceRepository
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
            resourceRepository,
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
            messageBoard: original.messageBoard,
            playerInputState: original.playerInputState,
            resourceRepository: original.resourceRepository,
        }
    },
}
