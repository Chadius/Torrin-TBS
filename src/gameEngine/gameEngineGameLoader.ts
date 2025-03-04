import { GameEngineState } from "./gameEngine"
import { MousePress, MouseRelease, ScreenLocation } from "../utils/mouseConfig"
import { GameEngineChanges, GameEngineComponent } from "./gameEngineComponent"
import {
    MissionLoader,
    MissionLoaderContext,
} from "../battle/loading/missionLoader"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../battle/orchestrator/battleOrchestratorState"
import { GameModeEnum } from "../utils/startupConfig"
import { MissionObjective } from "../battle/missionResult/missionObjective"
import { MissionCondition } from "../battle/missionResult/missionCondition"
import {
    BattleSaveState,
    BattleSaveStateService,
} from "../battle/history/battleSaveState"
import { SaveFile } from "../utils/fileHandling/saveFile"
import { DrawSquaddieUtilities } from "../battle/animation/drawSquaddie"
import { getResultOrThrowError } from "../utils/ResultOrError"
import { BattleCompletionStatus } from "../battle/orchestrator/missionObjectivesAndCutscenes"
import { BattleCameraService } from "../battle/battleCamera"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { Campaign, CampaignService } from "../campaign/campaign"
import { isValidValue } from "../utils/validityCheck"
import {
    CampaignLoaderContext,
    CampaignLoaderService,
} from "../dataLoader/campaignLoader"
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { CampaignFileFormat } from "../campaign/campaignFileFormat"
import {
    LoadMissionFromFile,
    LoadPlayerArmyFromFile,
    MissionFileFormat,
} from "../dataLoader/missionLoader"
import { PlayerArmy } from "../campaign/playerArmy"
import { ResourceHandlerBlocker } from "../dataLoader/loadBlocker/resourceHandlerBlocker"

export enum TransitionAction {
    REVERT_BACKUPS = "REVERT_BACKUPS",
    CLEAR_BACKUPS = "CLEAR_BACKUPS",
    CLEAR_LOADED_DATA = "CLEAR_LOADED_DATA",
    LOAD_BATTLE_SAVE_STATE = "LOAD_BATTLE_SAVE_STATE",
    UPDATE_CAMPAIGN_IS_ALREADY_LOADED = "UPDATE_CAMPAIGN_IS_ALREADY_LOADED",
    LOAD_CAMPAIGN = "LOAD_CAMPAIGN",
    LOAD_PLAYER_ARMY = "LOAD_PLAYER_ARMY",
    LOAD_MISSION = "LOAD_MISSION",
    BEGIN_LOADING_RESOURCES = "BEGIN_LOADING_RESOURCES",
    SET_COMPLETED_LOADING_RESOURCES_FLAG_IF_COMPLETE = "SET_COMPLETED_LOADING_RESOURCES_FLAG_IF_COMPLETE",
    APPLY_LOADED_CONTEXT = "APPLY_LOADED_CONTEXT",
    SET_APPLIED_CONTEXT_FLAG = "SET_APPLIED_CONTEXT_FLAG",
    APPLY_BATTLE_SAVE_STATE = "APPLY_BATTLE_SAVE_STATE",
    SET_SUCCESS_STATUS = "SET_SUCCESS_STATUS",
}

export class GameEngineGameLoader implements GameEngineComponent {
    missionLoaderContext: MissionLoaderContext
    campaignLoaderContext: CampaignLoaderContext
    backup: {
        campaign: Campaign
        mission: BattleOrchestratorState
    }
    transitionActions: TransitionAction[]

    loadedData: {
        mission: MissionFileFormat
        playerArmy: PlayerArmy
        campaign: CampaignFileFormat
    }
    status: {
        success: boolean
        error: boolean
        completedLoadingResources: boolean
        appliedContext: boolean
        campaignIsAlreadyLoaded: boolean
    }
    loadBlocker: ResourceHandlerBlocker

    constructor(campaignIdToLoad: string) {
        this.resetInternalFields()
        this.campaignLoaderContext.campaignIdToLoad = campaignIdToLoad
    }

    async update(gameEngineState: GameEngineState): Promise<void> {
        const actions = this.getTransitionActions(gameEngineState)
        const successful = await this.performActionsStopOnError(
            gameEngineState,
            actions
        )
        if (!successful) {
            this.status.error = true
        }
    }

    hasCompleted(state: GameEngineState): boolean {
        if (this.status.error) {
            return true
        }

        const campaignHasFinishedLoading: boolean =
            isValidValue(this.campaignLoaderContext.campaignIdToLoad) &&
            isValidValue(state.campaign)
        const missionHasFinishedLoading: boolean =
            this.missionLoaderContext.completionProgress.started &&
            this.missionLoaderContext.completionProgress.loadedFileData

        return (
            campaignHasFinishedLoading &&
            missionHasFinishedLoading &&
            this.status.success &&
            this.status.completedLoadingResources &&
            this.loadBlocker.finishesLoading
        )
    }

    recommendStateChanges(
        state: GameEngineState
    ): GameEngineChanges | undefined {
        if (this.status.error) {
            return {
                nextMode:
                    state.modeThatInitiatedLoading !== GameModeEnum.UNKNOWN
                        ? state.modeThatInitiatedLoading
                        : GameModeEnum.TITLE_SCREEN,
            }
        }
        return {
            nextMode: GameModeEnum.BATTLE,
        }
    }

    reset(_gameEngineState: GameEngineState) {
        this.resetInternalFields()
    }

    keyPressed(_gameEngineState: GameEngineState, _keyCode: number): void {
        // Required by inheritance
    }

    mousePressed(
        _gameEngineState: GameEngineState,
        _mousePress: MousePress
    ): void {
        // Required by inheritance
    }

    mouseReleased(
        _gameEngineState: GameEngineState,
        _mouseRelease: MouseRelease
    ): void {
        // Required by inheritance
    }

    mouseMoved(_gameEngineState: GameEngineState, _: ScreenLocation): void {
        // Required by inheritance
    }

    private applySaveStateToBattleOrchestratorState(
        gameEngineState: GameEngineState
    ) {
        if (!gameEngineState.fileState.loadSaveState.applicationCompletedLoad) {
            return
        }
        let battleOrchestratorState = gameEngineState.battleOrchestratorState
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: gameEngineState.fileState.loadSaveState.saveState,
            battleOrchestratorState: battleOrchestratorState,
            squaddieRepository: gameEngineState.repository,
        })

        if (battleOrchestratorState.isValid) {
            this.addMidTurnEffects(gameEngineState.repository)
        } else {
            console.error("Save file is incompatible. Reverting.")
            throw new Error("Save file is incompatible. Reverting.")
        }
        LoadSaveStateService.reset(gameEngineState.fileState.loadSaveState)
    }

    private applyMissionLoaderContextToBattleOrchestratorState(
        battleOrchestratorState: BattleOrchestratorState
    ) {
        battleOrchestratorState.battleState.missionId =
            this.missionLoaderContext.id
        battleOrchestratorState.battleState.missionMap =
            this.missionLoaderContext.missionMap
        battleOrchestratorState.battleState.cutsceneCollection =
            this.missionLoaderContext.cutsceneInfo.cutsceneCollection
        battleOrchestratorState.battleState.cutsceneTriggers = [
            ...this.missionLoaderContext.cutsceneInfo.cutsceneTriggers,
        ]
        battleOrchestratorState.battleState.teams = [
            ...this.missionLoaderContext.squaddieData.teams,
        ]

        battleOrchestratorState.battleState.teamStrategiesById =
            Object.fromEntries(
                this.missionLoaderContext.squaddieData.teams.map((team) => [
                    team.id,
                    this.missionLoaderContext.squaddieData.teamStrategyById[
                        team.id
                    ]
                        ? [
                              ...this.missionLoaderContext.squaddieData
                                  .teamStrategyById[team.id],
                          ]
                        : [],
                ])
            )

        battleOrchestratorState.battleState.battleCompletionStatus =
            BattleCompletionStatus.IN_PROGRESS
        battleOrchestratorState.battleState.camera = BattleCameraService.clone({
            original: this.missionLoaderContext.mapSettings.camera,
        })

        battleOrchestratorState.battleState.missionCompletionStatus = {}
        battleOrchestratorState.battleState.objectives =
            this.missionLoaderContext.objectives
        battleOrchestratorState.battleState.objectives.forEach(
            (objective: MissionObjective) => {
                const conditions: {
                    [missionConditionId: string]: boolean
                } = {}
                objective.conditions.forEach((condition: MissionCondition) => {
                    conditions[condition.id] = undefined
                })

                battleOrchestratorState.battleState.missionCompletionStatus[
                    objective.id
                ] = {
                    isComplete: undefined,
                    conditions,
                }
            }
        )
    }

    private resetBattleOrchestratorState(
        battleOrchestratorState: BattleOrchestratorState
    ) {
        battleOrchestratorState.copyOtherOrchestratorState(
            BattleOrchestratorStateService.new({})
        )
        battleOrchestratorState.battleHUDState.summaryHUDState = undefined
    }

    private resetInternalFields() {
        this.missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext()
        this.campaignLoaderContext = isValidValue(this.campaignLoaderContext)
            ? this.campaignLoaderContext
            : CampaignLoaderService.newLoaderContext()
        this.backup = {
            mission: undefined,
            campaign: undefined,
        }
        this.loadedData = {
            mission: undefined,
            playerArmy: undefined,
            campaign: undefined,
        }
        this.transitionActions = []
        this.status = {
            success: false,
            error: false,
            completedLoadingResources: false,
            appliedContext: false,
            campaignIsAlreadyLoaded: false,
        }
    }

    private addMidTurnEffects(repository: ObjectRepository) {
        ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach(
            (info) => {
                const { battleSquaddie, battleSquaddieId } = info
                const { squaddieTemplate } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        battleSquaddieId
                    )
                )
                DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
                    battleSquaddie,
                    squaddieTemplate,
                    repository
                )
            }
        )
    }

    private getTransitionActions(gameEngineState: GameEngineState) {
        if (this.status.error === true) {
            return [
                TransitionAction.REVERT_BACKUPS,
                TransitionAction.CLEAR_BACKUPS,
            ]
        }

        if (this.status.success === true) {
            return [
                TransitionAction.CLEAR_LOADED_DATA,
                TransitionAction.CLEAR_BACKUPS,
            ]
        }

        if (
            gameEngineState.fileState.loadSaveState.userRequestedLoad &&
            gameEngineState.fileState.loadSaveState.saveState == undefined
        ) {
            return [
                TransitionAction.LOAD_BATTLE_SAVE_STATE,
                TransitionAction.UPDATE_CAMPAIGN_IS_ALREADY_LOADED,
            ]
        }

        if (
            this.loadedData.campaign == undefined &&
            !this.status.campaignIsAlreadyLoaded
        ) {
            return [TransitionAction.LOAD_CAMPAIGN]
        }

        if (this.loadedData.mission == undefined) {
            return [
                TransitionAction.LOAD_MISSION,
                TransitionAction.LOAD_PLAYER_ARMY,
                TransitionAction.BEGIN_LOADING_RESOURCES,
            ]
        }

        if (!this.status.completedLoadingResources) {
            return [
                TransitionAction.SET_COMPLETED_LOADING_RESOURCES_FLAG_IF_COMPLETE,
            ]
        }

        if (
            this.status.completedLoadingResources &&
            this.status.appliedContext === false
        ) {
            return [
                TransitionAction.APPLY_LOADED_CONTEXT,
                TransitionAction.SET_APPLIED_CONTEXT_FLAG,
            ]
        }

        if (this.status.appliedContext) {
            return [
                TransitionAction.APPLY_BATTLE_SAVE_STATE,
                TransitionAction.SET_SUCCESS_STATUS,
            ]
        }
    }

    private async performActionsStopOnError(
        gameEngineState: GameEngineState,
        actions: TransitionAction[]
    ): Promise<boolean> {
        const runActionAndCheckForSuccess = async (
            action: TransitionAction
        ): Promise<boolean> => {
            switch (action) {
                case TransitionAction.REVERT_BACKUPS:
                    return this.revertBackups(gameEngineState)
                case TransitionAction.CLEAR_BACKUPS:
                    return this.clearBackups()
                case TransitionAction.CLEAR_LOADED_DATA:
                    return this.clearLoadedData()
                case TransitionAction.LOAD_BATTLE_SAVE_STATE:
                    return await this.loadBattleSaveState(gameEngineState)
                case TransitionAction.UPDATE_CAMPAIGN_IS_ALREADY_LOADED:
                    return this.updateCampaignIsAlreadyLoaded(gameEngineState)
                case TransitionAction.LOAD_PLAYER_ARMY:
                    return await this.loadPlayerArmy()
                case TransitionAction.LOAD_CAMPAIGN:
                    return await this.loadCampaign(gameEngineState)
                case TransitionAction.LOAD_MISSION:
                    return await this.loadMission(gameEngineState)
                case TransitionAction.BEGIN_LOADING_RESOURCES:
                    return await this.beginLoadingResources(gameEngineState)
                case TransitionAction.SET_COMPLETED_LOADING_RESOURCES_FLAG_IF_COMPLETE:
                    return this.setCompletedLoadingResourcesFlagIfComplete(
                        gameEngineState
                    )
                case TransitionAction.APPLY_LOADED_CONTEXT:
                    return this.applyLoadedContext(gameEngineState)
                case TransitionAction.SET_APPLIED_CONTEXT_FLAG:
                    return this.setAppliedContextFlag(gameEngineState)
                case TransitionAction.APPLY_BATTLE_SAVE_STATE:
                    return this.applyBattleSaveState(gameEngineState)
                case TransitionAction.SET_SUCCESS_STATUS:
                    return this.setSuccessStatus()
                default:
                    console.error(
                        `[GameEngineGameLoader.performActionsStopOnError] unknown TransitionAction ${action}`
                    )
                    return false
            }
        }

        for (const action of actions) {
            if (!(await runActionAndCheckForSuccess(action))) return false
        }
        return true
    }

    private clearBackups() {
        this.backup = {
            mission: undefined,
            campaign: undefined,
        }
        return true
    }

    private clearLoadedData() {
        this.loadedData = {
            mission: undefined,
            playerArmy: undefined,
            campaign: undefined,
        }
        return true
    }

    private async loadBattleSaveState(gameEngineState: GameEngineState) {
        let success: boolean = false
        await SaveFile.RetrieveFileContent()
            .then((saveState: BattleSaveState) => {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE,
                    loadSaveState: gameEngineState.fileState.loadSaveState,
                    saveState,
                })
                success = true
            })
            .catch((reason) => {
                if (reason.message === "user canceled") {
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL,
                        loadSaveState: gameEngineState.fileState.loadSaveState,
                    })
                } else {
                    gameEngineState.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                        loadSaveState: gameEngineState.fileState.loadSaveState,
                    })
                }
                console.error("Failed to load progress file from storage.")
                console.error(reason)
                success = false
            })
        return success
    }

    private async loadCampaign(gameEngineState: GameEngineState) {
        let campaignId: string
        switch (true) {
            case gameEngineState?.fileState?.loadSaveState?.saveState
                ?.campaignId != undefined:
                campaignId =
                    gameEngineState?.fileState?.loadSaveState?.saveState
                        ?.campaignId
                break
            case this.loadedData?.campaign?.id != undefined:
                campaignId = this.loadedData?.campaign?.id
                break
            default:
                campaignId = this.campaignLoaderContext.campaignIdToLoad
                break
        }

        const campaignData =
            await CampaignLoaderService.loadCampaignFromFile(campaignId)
        if (!isValidValue(campaignData)) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })
            console.error(`Loading campaign ${campaignId} failed`)
            return false
        }
        this.loadedData.campaign = campaignData
        this.campaignLoaderContext.campaignIdToLoad = campaignId
        this.loadBlocker = new ResourceHandlerBlocker(
            gameEngineState.resourceHandler,
            gameEngineState.messageBoard
        )
        return true
    }

    private async loadPlayerArmy() {
        this.loadedData.playerArmy = await LoadPlayerArmyFromFile()
        return this.loadedData.playerArmy != undefined
    }

    private getCampaignInfo(gameEngineState: GameEngineState) {
        if (this.loadedData.campaign != undefined) {
            return {
                id: this.loadedData.campaign.id,
                nextMissionId: CampaignService.getNextMissionId(
                    this.loadedData.campaign
                ),
                resources: this.loadedData.campaign.resources,
                campaign: this.loadedData.campaign,
            }
        }

        if (gameEngineState.campaign) {
            return {
                id: gameEngineState.campaign.id,
                nextMissionId: CampaignService.getNextMissionId(
                    gameEngineState.campaign
                ),
                resources: gameEngineState.campaign.resources,
                campaign: gameEngineState.campaign,
            }
        }
    }

    private async loadMission(gameEngineState: GameEngineState) {
        const { id: campaignId, nextMissionId } =
            this.getCampaignInfo(gameEngineState)

        this.loadedData.mission = await LoadMissionFromFile(
            campaignId,
            nextMissionId
        )

        return this.loadedData.mission != undefined
    }

    private revertBackups(gameEngineState: GameEngineState) {
        if (this.backup.campaign) {
            gameEngineState.campaign = this.backup.campaign
        }
        if (this.backup.mission) {
            gameEngineState.battleOrchestratorState.copyOtherOrchestratorState(
                this.backup.mission
            )
        }
        return true
    }

    private async beginLoadingResources(gameEngineState: GameEngineState) {
        if (this.loadBlocker.startsLoading) return
        if (isValidValue(gameEngineState.repository)) {
            ObjectRepositoryService.reset(gameEngineState.repository)
        }

        const {
            id,
            campaign,
            resources: campaignResources,
        } = this.getCampaignInfo(gameEngineState)

        this.loadBlocker.queueResourceToLoad([
            ...Object.values(
                campaignResources.missionMapMovementIconResourceKeys
            ),
            ...Object.values(
                campaignResources.missionMapAttackIconResourceKeys
            ),
            ...Object.values(
                campaignResources.missionAttributeIconResourceKeys
            ),
            ...Object.values(
                campaignResources.actionEffectSquaddieTemplateButtonIcons
            ),
            ...campaignResources.mapTiles.resourceKeys,
            ...Object.values(campaignResources.attributeIcons),
            ...Object.values(campaignResources.attributeComparisons),
        ])

        await MissionLoader.applyMissionData({
            missionData: this.loadedData.mission,
            missionLoaderContext: this.missionLoaderContext,
            objectRepository: gameEngineState.repository,
            loadBlocker: this.loadBlocker,
        })
        await MissionLoader.loadPlayerSquaddieTemplatesFile({
            playerArmyData: this.loadedData.playerArmy,
            missionLoaderContext: this.missionLoaderContext,
            objectRepository: gameEngineState.repository,
            loadBlocker: this.loadBlocker,
        })
        await MissionLoader.createAndAddBattleSquaddies({
            playerArmyData: this.loadedData.playerArmy,
            objectRepository: gameEngineState.repository,
        })

        gameEngineState.campaignIdThatWasLoaded = id
        gameEngineState.campaign = campaign
        this.loadBlocker.beginLoading()
        return true
    }

    private isLoadingFinished(gameEngineState: GameEngineState) {
        if (!this.loadedData.playerArmy) {
            return false
        }
        const playerArmyHasLoaded = this.loadedData.playerArmy.squaddieBuilds
            .map((build) => build.squaddieTemplateId)
            .every(
                (template) =>
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        template
                    ) != undefined
            )
        const missionIsStillLoadingCutscenes =
            this.missionLoaderContext.cutsceneInfo.cutsceneCollection ===
            undefined
        const missionIsStillWaiting =
            !playerArmyHasLoaded || missionIsStillLoadingCutscenes

        this.loadBlocker.updateLoadingStatus()
        const resourceHandlerFinishedLoading = this.loadBlocker.finishesLoading
        return !missionIsStillWaiting && resourceHandlerFinishedLoading
    }

    private setCompletedLoadingResourcesFlagIfComplete(
        gameEngineState: GameEngineState
    ) {
        if (this.isLoadingFinished(gameEngineState)) {
            this.status.completedLoadingResources = true
        }
        return true
    }

    private applyLoadedContext(gameEngineState: GameEngineState) {
        if (this.isLoadingFinished(gameEngineState)) {
            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext: this.missionLoaderContext,
                resourceHandler: gameEngineState.resourceHandler,
                repository: gameEngineState.repository,
            })
            this.resetBattleOrchestratorState(
                gameEngineState.battleOrchestratorState
            )
            this.applyMissionLoaderContextToBattleOrchestratorState(
                gameEngineState.battleOrchestratorState
            )
        }

        return true
    }

    private setAppliedContextFlag(gameEngineState: GameEngineState) {
        if (this.isLoadingFinished(gameEngineState)) {
            this.status.appliedContext = true
        }

        return true
    }

    private applyBattleSaveState(gameEngineState: GameEngineState) {
        this.resetBattleOrchestratorState(
            gameEngineState.battleOrchestratorState
        )
        this.applyMissionLoaderContextToBattleOrchestratorState(
            gameEngineState.battleOrchestratorState
        )
        try {
            this.applySaveStateToBattleOrchestratorState(gameEngineState)
            return true
        } catch (error) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                loadSaveState: gameEngineState.fileState.loadSaveState,
            })
            return false
        }
    }

    private setSuccessStatus() {
        this.status.success = true
        return true
    }

    private updateCampaignIsAlreadyLoaded(gameEngineState: GameEngineState) {
        this.status.campaignIsAlreadyLoaded =
            gameEngineState?.campaign?.id &&
            gameEngineState?.fileState?.loadSaveState?.saveState?.campaignId ==
                gameEngineState.campaign.id
        return true
    }
}
