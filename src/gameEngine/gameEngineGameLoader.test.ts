import { GameEngineGameLoader } from "./gameEngineGameLoader"
import { ResourceHandler } from "../resource/resourceHandler"
import * as mocks from "./../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { MissionFileFormat } from "../dataLoader/missionLoader"
import { MissionRewardType } from "../battle/missionResult/missionReward"
import { MissionConditionType } from "../battle/missionResult/missionCondition"
import { DEFAULT_VICTORY_CUTSCENE_ID } from "../battle/orchestrator/missionCutsceneCollection"
import { GameModeEnum } from "../utils/startupConfig"
import {
    BattleSaveState,
    DefaultBattleSaveState,
} from "../battle/history/battleSaveState"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { MissionObjectiveHelper } from "../battle/missionResult/missionObjective"
import { MissionStatisticsService } from "../battle/missionStatistics/missionStatistics"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { SaveFile } from "../utils/fileHandling/saveFile"
import { BattleCamera } from "../battle/battleCamera"
import { TriggeringEvent } from "../cutscene/cutsceneTrigger"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCompletionStatus } from "../battle/orchestrator/missionObjectivesAndCutscenes"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { TitleScreenStateHelper } from "../titleScreen/titleScreenState"
import { GameEngineState, GameEngineStateService } from "./gameEngine"
import { CutsceneService } from "../cutscene/cutscene"
import { CampaignService } from "../campaign/campaign"
import { CampaignFileFormat } from "../campaign/campaignFileFormat"
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { BattleHUDService } from "../battle/hud/battleHUD"
import { LoadCampaignData } from "../utils/fileHandling/loadCampaignData"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { PlayerDataMessageListener } from "../dataLoader/playerData/playerDataMessageListener"

describe("GameEngineGameLoader", () => {
    let loader: GameEngineGameLoader
    let missionData: MissionFileFormat
    let campaignFileData: CampaignFileFormat
    let loadFileIntoFormatSpy: MockInstance
    let gameEngineState: GameEngineState
    let resourceHandler: ResourceHandler
    let squaddieRepository: ObjectRepository
    const campaignId = "coolCampaign"

    beforeEach(() => {
        loader = new GameEngineGameLoader(campaignId)

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = vi
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValue(true)
        resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
        resourceHandler.loadResource = vi
            .fn()
            .mockReturnValue({ width: 1, height: 1 })
        squaddieRepository = ObjectRepositoryService.new()

        gameEngineState = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "",
                    campaignId,
                }),
            }),
        })
        ;({ loadFileIntoFormatSpy, campaignFileData, missionData } =
            LoadCampaignData.createLoadFileSpy())
    })

    afterEach(() => {
        loadFileIntoFormatSpy.mockRestore()
    })

    describe("loading the campaign", () => {
        it("loads the campaign first", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loadFileIntoFormatSpy).toBeCalledWith(
                "assets/campaign/coolCampaign/campaign.json"
            )
        })
        it("adds the campaign resources to the pending list", async () => {
            const expectedResourceKeys = [
                ...Object.values(
                    campaignFileData.resources
                        .missionMapMovementIconResourceKeys
                ),
                ...Object.values(
                    campaignFileData.resources.missionMapAttackIconResourceKeys
                ),
                ...Object.values(
                    campaignFileData.resources.missionAttributeIconResourceKeys
                ),
                ...Object.values(
                    campaignFileData.resources
                        .actionEffectSquaddieTemplateButtonIcons
                ),
                ...Object.values(
                    campaignFileData.resources.mapTiles.resourceKeys
                ),
                ...Object.values(
                    campaignFileData.resources.attributeComparisons
                ),
                ...Object.values(campaignFileData.resources.attributeIcons),
            ]

            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(
                gameEngineState.resourceHandler.areAllResourcesLoaded(
                    expectedResourceKeys
                )
            ).toBeFalsy()
            expect(
                loader.campaignLoaderContext.resourcesPendingLoading
            ).toEqual(expect.arrayContaining(expectedResourceKeys))
            expect(
                loader.campaignLoaderContext.resourcesPendingLoading
            ).toHaveLength(expectedResourceKeys.length)
        })
        it("knows it has not gotten resources yet", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loader.appliedResources).toBeFalsy()
        })
        it("knows it is not complete", async () => {
            expect(loader.hasCompleted(gameEngineState)).toBeFalsy()
            await loader.update(gameEngineState)
            expect(loader.hasCompleted(gameEngineState)).toBeFalsy()
        })
    })

    describe("loading the mission", () => {
        it("asks the loader to load the mission", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loadFileIntoFormatSpy).toBeCalledWith(
                "assets/campaign/coolCampaign/missions/0000.json"
            )
        })

        it("knows file has been loaded", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(
                loader.missionLoaderContext.completionProgress.started
            ).toBeTruthy()
        })

        it("knows it has not gotten resources yet", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loader.appliedResources).toBeFalsy()
        })

        it("knows it is not complete", async () => {
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loader.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("reports errors", async () => {
            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            loadFileIntoFormatSpy.mockRejectedValue("Error")
            await loadCampaignAndMissionFromFiles(loader, gameEngineState)
            expect(loader.errorFoundWhileLoading).toBeTruthy()
            expect(consoleErrorSpy).toBeCalledWith(
                expect.stringContaining("Error while loading campaign file")
            )
            expect(consoleErrorSpy).toBeCalledWith("Error")
            expect(consoleErrorSpy).toBeCalledWith(
                new Error("Loading campaign coolCampaign failed")
            )
            consoleErrorSpy.mockRestore()
        })
    })

    describe("will wait for the resources to load before finishing", () => {
        let squaddieRepositorySize: number

        beforeEach(async () => {
            squaddieRepositorySize = await loadResources(
                loader,
                gameEngineState
            )
        })

        it("should load resources into the handler", () => {
            expect(
                loader.missionLoaderContext.resourcesPendingLoading
            ).toHaveLength(0)
        })

        it("should be complete", () => {
            expect(loader.appliedResources).toBeTruthy()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
        })

        it("should recommend the battle scene as the next object", () => {
            expect(loader.recommendStateChanges(gameEngineState).nextMode).toBe(
                GameModeEnum.BATTLE
            )
        })

        it("mission id", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState.missionId
            ).toEqual(missionData.id)
        })

        it("campaign id", () => {
            expect(gameEngineState.campaign.id).toEqual(campaignFileData.id)
        })

        it("mission map", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            ).toEqual(loader.missionLoaderContext.missionMap.terrainTileMap)
        })

        it("mission objectives", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState.objectives
            ).toEqual(loader.missionLoaderContext.objectives)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .missionCompletionStatus
            ).toEqual({
                victory: {
                    isComplete: undefined,
                    conditions: {
                        defeat_all_enemies: undefined,
                    },
                },
                defeat: {
                    isComplete: undefined,
                    conditions: {
                        defeat_all_players: undefined,
                    },
                },
            })
        })

        it("squaddies", () => {
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    gameEngineState.repository
                ).length
            ).toBeGreaterThan(0)
            expect(
                gameEngineState.battleOrchestratorState.battleState.teams.length
            ).toBeGreaterThan(0)

            expect(
                gameEngineState.battleOrchestratorState.battleState.teams.some(
                    (team) =>
                        team.affiliation === SquaddieAffiliation.PLAYER &&
                        team.id === missionData.player.teamId
                )
            ).toBeTruthy()

            expect(
                Object.keys(
                    gameEngineState.battleOrchestratorState.battleState
                        .teamStrategiesById
                ).length
            ).toBeGreaterThan(0)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .teamStrategiesById[
                    missionData.npcDeployments.enemy.teams[0].id
                ]
            ).toEqual(missionData.npcDeployments.enemy.teams[0].strategies)

            expect(
                Object.keys(
                    gameEngineState.repository.imageUIByBattleSquaddieId
                )
            ).toHaveLength(squaddieRepositorySize)

            ObjectRepositoryService.getSquaddieTemplateIterator(
                gameEngineState.repository
            ).forEach((entry) => {
                const { squaddieTemplate } = entry
                expect(
                    squaddieTemplate.actionTemplateIds.every(
                        (id) =>
                            ObjectRepositoryService.getActionTemplateById(
                                gameEngineState.repository,
                                id
                            ) !== undefined
                    )
                ).toBeTruthy()
            })
        })

        it("cutscenes", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .cutsceneTriggers.length
            ).toBeGreaterThan(0)
            expect(
                CutsceneService.hasLoaded(
                    gameEngineState.battleOrchestratorState.battleState
                        .cutsceneCollection.cutsceneById[
                        DEFAULT_VICTORY_CUTSCENE_ID
                    ],
                    resourceHandler
                )
            ).toBeTruthy()
        })

        it("campaign resources", () => {
            expect(gameEngineState.campaign.resources).toEqual(
                campaignFileData.resources
            )
        })

        it("initializes the camera", () => {
            expect(
                loader.missionLoaderContext.mapSettings.camera
                    .mapDimensionBoundaries.widthOfWidestRow
            ).toBe(17)
            expect(
                loader.missionLoaderContext.mapSettings.camera
                    .mapDimensionBoundaries.numberOfRows
            ).toBe(18)

            expect(
                gameEngineState.battleOrchestratorState.battleState.camera
                    .mapDimensionBoundaries.widthOfWidestRow
            ).toBe(17)
            expect(
                gameEngineState.battleOrchestratorState.battleState.camera
                    .mapDimensionBoundaries.numberOfRows
            ).toBe(18)
        })
    })

    describe("user wants to load a file while in BattleOrchestrator mode", () => {
        let openDialogSpy: MockInstance
        let loadedBattleSaveState: BattleSaveState
        let originalState: GameEngineState
        let currentState: GameEngineState

        beforeEach(() => {
            loader = new GameEngineGameLoader(campaignId)
            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                campaignId,
                missionStatistics: {
                    ...MissionStatisticsService.new({}),
                    timeElapsedInMilliseconds: 1,
                },
                teams: [
                    {
                        id: "playerTeam",
                        name: "Players",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [],
                        iconResourceKey: "",
                    },
                ],
                cutsceneTriggerCompletion: [
                    {
                        triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                        cutsceneId: "default_victory",
                        systemReactedToTrigger: false,
                    },
                    {
                        triggeringEvent: TriggeringEvent.START_OF_TURN,
                        cutsceneId: "introduction",
                        systemReactedToTrigger: false,
                        turn: 0,
                    },
                ],
            }
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockResolvedValue(loadedBattleSaveState)

            originalState = GameEngineStateService.new({
                repository: squaddieRepository,
                previousMode: GameModeEnum.BATTLE,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        campaignId: campaignFileData.id,
                        missionId: "test mission",
                        camera: new BattleCamera(100, 200),
                        missionMap: NullMissionMap(),
                        missionStatistics: {
                            ...MissionStatisticsService.new({}),
                            timeElapsedInMilliseconds: 9001,
                        },
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.VICTORY,
                                },
                                hasGivenReward: false,
                                numberOfRequiredConditionsToComplete: 1,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                    },
                                ],
                            }),
                        ],
                        cutsceneTriggers: [
                            {
                                cutsceneId: "introductory",
                                triggeringEvent: TriggeringEvent.START_OF_TURN,
                                turn: 0,
                                systemReactedToTrigger: true,
                            },
                        ],
                        missionCompletionStatus: {},
                    }),
                }),
                campaign: CampaignService.default(),
            })
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            originalState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            originalState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: originalState.fileState.loadSaveState,
            })
            currentState = GameEngineStateService.new({
                titleScreenState: { ...originalState.titleScreenState },
                battleOrchestratorState:
                    originalState.battleOrchestratorState.clone(),
                campaign: { ...originalState.campaign },
                repository: originalState.repository,
                resourceHandler: originalState.resourceHandler,
            })
            currentState.modeThatInitiatedLoading =
                originalState.modeThatInitiatedLoading
            currentState.fileState.saveSaveState = SaveSaveStateService.clone(
                originalState.fileState.saveSaveState
            )
            currentState.fileState.loadSaveState = LoadSaveStateService.clone(
                originalState.fileState.loadSaveState
            )
            currentState.campaignIdThatWasLoaded =
                originalState.campaignIdThatWasLoaded
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
            )
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
            )
        })

        it("will backup the battle orchestrator gameEngineState", async () => {
            await loader.update(currentState)
            expect(loader.backupBattleOrchestratorState).toEqual(
                originalState.battleOrchestratorState
            )
        })

        it("knows the user requested a save", async () => {
            await loader.update(currentState)
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeTruthy()
        })

        it("will try to begin retrieving file content", async () => {
            const retrieveSpy = vi.spyOn(SaveFile, "RetrieveFileContent")
            await loader.update(currentState)
            expect(retrieveSpy).toBeCalled()
        })

        it("will try to open a file dialog", async () => {
            await loader.update(currentState)
            expect(openDialogSpy).toBeCalled()
        })

        it("will save the loaded save data", async () => {
            await loader.update(currentState)
            expect(loader.loadedBattleSaveState).toEqual(loadedBattleSaveState)
        })

        it("will try to apply the saved data", async () => {
            currentState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.VICTORY
            currentState.battleOrchestratorState.battleState.battlePhaseState =
                {
                    turnCount: 1,
                    currentAffiliation: BattlePhase.PLAYER,
                }
            await loader.update(currentState)
            await loader.update(currentState)
            expect(
                loader.missionLoaderContext.resourcesPendingLoading
            ).toHaveLength(0)
            expect(
                currentState.battleOrchestratorState.battleState
                    .cutsceneTriggers.length
            ).toBeGreaterThan(0)
            expect(
                CutsceneService.hasLoaded(
                    gameEngineState.battleOrchestratorState.battleState
                        .cutsceneCollection.cutsceneById[
                        DEFAULT_VICTORY_CUTSCENE_ID
                    ],
                    resourceHandler
                )
            ).toBeTruthy()
            expect(
                currentState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBe(1)
            expect(
                currentState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)
            expect(
                currentState.battleOrchestratorState.battleState
                    .battlePhaseState
            ).toEqual({
                turnCount: 0,
                currentAffiliation: BattlePhase.UNKNOWN,
            })

            expect(
                currentState.battleOrchestratorState.missingComponents
            ).toHaveLength(0)
            expect(currentState.battleOrchestratorState.isValid).toBeTruthy()
        })

        it("will mark the save as complete", async () => {
            await loadResources(loader, currentState)

            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
        })

        it("should print error message if retrieving a file throws an error", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalledWith(
                "Failed to load progress file from storage."
            )
        })

        it("should abort loading if the applied file is invalid.", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            vi.spyOn(
                currentState.battleOrchestratorState,
                "isValid",
                "get"
            ).mockReturnValue(false)
            await loader.update(currentState)
            expect(loader.backupBattleOrchestratorState).toEqual(
                originalState.battleOrchestratorState
            )
            await loader.update(currentState)
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
            expect(loader.errorFoundWhileLoading).toBeTruthy()

            expect(
                currentState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toEqual(
                originalState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            )

            expect(consoleErrorSpy).toBeCalledWith(
                "Save file is incompatible. Reverting."
            )
            expect(loader.hasCompleted(currentState)).toBeTruthy()
        })

        it("will be complete and return to battle mode if there is an error", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalled()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(
                GameModeEnum.BATTLE
            )
        })
    })

    describe("user wants to load a file while in TitleScreen mode", () => {
        let openDialogSpy: MockInstance
        let loadedBattleSaveState: BattleSaveState
        let originalState: GameEngineState
        let currentState: GameEngineState

        beforeEach(() => {
            loader = new GameEngineGameLoader(campaignId)
            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                campaignId,
                missionStatistics: {
                    ...MissionStatisticsService.new({}),
                    timeElapsedInMilliseconds: 1,
                },
                teams: [
                    {
                        id: "playerTeam",
                        name: "Players",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [],
                        iconResourceKey: "",
                    },
                ],
                cutsceneTriggerCompletion: [
                    {
                        triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                        cutsceneId: "default_victory",
                        systemReactedToTrigger: false,
                    },
                    {
                        triggeringEvent: TriggeringEvent.START_OF_TURN,
                        cutsceneId: "introduction",
                        systemReactedToTrigger: false,
                        turn: 0,
                    },
                ],
            }
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockResolvedValue(loadedBattleSaveState)

            originalState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default(),
            })
            currentState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                previousMode: GameModeEnum.TITLE_SCREEN,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default(),
            })
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
            )
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
            )
            currentState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: currentState.fileState.loadSaveState,
            })
        })

        it("will try to begin retrieving file content", async () => {
            const retrieveSpy = vi.spyOn(SaveFile, "RetrieveFileContent")
            await loader.update(currentState)
            await loader.update(currentState)
            expect(retrieveSpy).toBeCalled()
        })

        it("will try to open a file dialog", async () => {
            await loader.update(currentState)
            await loader.update(currentState)
            expect(openDialogSpy).toBeCalled()
        })

        it("will save the loaded save data", async () => {
            await loader.update(currentState)
            await loader.update(currentState)
            expect(loader.loadedBattleSaveState).toEqual(loadedBattleSaveState)
        })

        it("will try to apply the saved data", async () => {
            await loader.update(currentState)
            await loader.update(currentState)
            await loader.update(currentState)
            expect(
                loader.missionLoaderContext.resourcesPendingLoading
            ).toHaveLength(0)
            expect(
                currentState.battleOrchestratorState.battleState
                    .cutsceneTriggers.length
            ).toBeGreaterThan(0)
            expect(
                CutsceneService.hasLoaded(
                    gameEngineState.battleOrchestratorState.battleState
                        .cutsceneCollection.cutsceneById[
                        DEFAULT_VICTORY_CUTSCENE_ID
                    ],
                    resourceHandler
                )
            ).toBeTruthy()
            expect(
                currentState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toBe(1)
            expect(
                currentState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)
            expect(
                currentState.battleOrchestratorState.battleState
                    .battlePhaseState
            ).toEqual({
                turnCount: 0,
                currentAffiliation: BattlePhase.UNKNOWN,
            })

            expect(
                currentState.battleOrchestratorState.missingComponents
            ).toHaveLength(0)
            expect(currentState.battleOrchestratorState.isValid).toBeTruthy()
        })

        it("will mark the save as complete", async () => {
            await loader.update(currentState)
            await loader.update(currentState)
            await loader.update(currentState)

            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
        })

        it("should print error message if retrieving a file throws an error", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            await loader.update(currentState)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalledWith(
                "Failed to load progress file from storage."
            )
        })

        it("should abort loading if the applied file is invalid.", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            vi.spyOn(
                currentState.battleOrchestratorState,
                "isValid",
                "get"
            ).mockReturnValue(false)
            await loadResources(loader, currentState)
            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(loader.errorFoundWhileLoading).toBeTruthy()

            expect(
                currentState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            ).toEqual(
                originalState.battleOrchestratorState.battleState
                    .missionStatistics.timeElapsedInMilliseconds
            )

            expect(consoleErrorSpy).toBeCalledWith(
                "Save file is incompatible. Reverting."
            )
            expect(loader.hasCompleted(currentState)).toBeTruthy()
        })

        it("will be complete and return to title screen mode if there is an error", async () => {
            let consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            openDialogSpy = vi
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            currentState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: currentState.fileState.loadSaveState,
            })
            await loader.update(currentState)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalled()
            expect(openDialogSpy).toBeCalled()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(
                GameModeEnum.TITLE_SCREEN
            )
            openDialogSpy.mockRestore()
        })

        describe("Load a different campaign", () => {
            let retrieveSpy: MockInstance

            beforeEach(async () => {
                await loadResources(loader, currentState)

                loadedBattleSaveState = {
                    ...DefaultBattleSaveState(),
                    campaignId: "theNewCampaign",
                    missionStatistics: {
                        ...MissionStatisticsService.new({}),
                        timeElapsedInMilliseconds: 1,
                    },
                    teams: [
                        {
                            id: "playerTeam",
                            name: "Players",
                            affiliation: SquaddieAffiliation.PLAYER,
                            battleSquaddieIds: [],
                            iconResourceKey: "",
                        },
                    ],
                    cutsceneTriggerCompletion: [
                        {
                            triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                            cutsceneId: "default_victory",
                            systemReactedToTrigger: false,
                        },
                        {
                            triggeringEvent: TriggeringEvent.START_OF_TURN,
                            cutsceneId: "introduction",
                            systemReactedToTrigger: false,
                            turn: 0,
                        },
                    ],
                }
                loader.reset(currentState)
                retrieveSpy = vi
                    .spyOn(SaveFile, "RetrieveFileContent")
                    .mockResolvedValue(loadedBattleSaveState)
                currentState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                    loadSaveState: currentState.fileState.loadSaveState,
                })
            })

            afterEach(() => {
                retrieveSpy.mockRestore()
            })

            it("will read the file to figure out the campaign Id to load", async () => {
                await reactToLoadRequest(loader, currentState)
                await loadCampaignAndMissionFromFiles(loader, currentState)
                expect(retrieveSpy).toBeCalled()
                expect(openDialogSpy).toBeCalled()
                expect(loader.loadedBattleSaveState).toEqual(
                    loadedBattleSaveState
                )
                expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual(
                    "theNewCampaign"
                )
                retrieveSpy.mockRestore()
            })

            it("will try to load the campaign", async () => {
                await reactToLoadRequest(loader, currentState)
                await loadCampaignAndMissionFromFiles(loader, currentState)
                expect(loadFileIntoFormatSpy).toBeCalledWith(
                    "assets/campaign/theNewCampaign/campaign.json"
                )
            })

            it("will clear the loading state once it has finished", async () => {
                await reactToLoadRequest(loader, currentState)
                await loadResources(loader, currentState)
                expect(loader.finishedLoading).toBeTruthy()
            })

            it("will not change the campaign if the load fails", async () => {
                const consoleErrorSpy = vi
                    .spyOn(console, "error")
                    .mockImplementation(() => {})
                loadFileIntoFormatSpy.mockRejectedValue("Error")
                await reactToLoadRequest(loader, currentState)
                await loadCampaignAndMissionFromFiles(loader, currentState)
                expect(consoleErrorSpy).toBeCalledWith(
                    new Error("Loading campaign theNewCampaign failed")
                )
                expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual(
                    campaignId
                )
                expect(
                    currentState.fileState.loadSaveState
                        .applicationErroredWhileLoading
                ).toBeTruthy()
                consoleErrorSpy.mockRestore()
            })
        })
    })

    describe("reloading the same campaign while game is in progress", () => {
        beforeEach(async () => {
            await loadResources(loader, gameEngineState)
        })

        const resetLoaderAndClearBattleOrchestratorState = () => {
            loader.reset(gameEngineState)
            gameEngineState.battleOrchestratorState.copyOtherOrchestratorState(
                BattleOrchestratorStateService.new({})
            )
        }

        it("will persist the campaign loading context by default", () => {
            expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual(
                campaignId
            )
            loader.reset(gameEngineState)
            expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual(
                campaignId
            )
        })

        it("will load battle resources again but nothing else", async () => {
            expect(loader.appliedResources).toBeTruthy()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
            const initialFileLoadCalls = loadFileIntoFormatSpy.mock.calls.length

            resetLoaderAndClearBattleOrchestratorState()

            await reactToLoadRequest(loader, gameEngineState)
            const missionMapCallsCount = 1
            const playerArmyCallsCount = 1
            const npcActionTemplatesCallsCount = 1
            const templateCallsCount =
                Object.keys(missionData.player.deployment).length +
                missionData.npcDeployments.enemy.templateIds.length +
                missionData.npcDeployments.ally.templateIds.length +
                missionData.npcDeployments.noAffiliation.templateIds.length
            expect(loadFileIntoFormatSpy).toBeCalledTimes(
                initialFileLoadCalls +
                    missionMapCallsCount +
                    templateCallsCount +
                    playerArmyCallsCount +
                    npcActionTemplatesCallsCount
            )
            expect(
                loader.missionLoaderContext.completionProgress.started
            ).toBeTruthy()
            expect(
                loader.missionLoaderContext.completionProgress.loadedFileData
            ).toBeTruthy()
            expect(loader.appliedResources).toBeFalsy()
            expect(loader.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("will switch to battle mode once resources have finished loading", async () => {
            resetLoaderAndClearBattleOrchestratorState()
            await loadResources(loader, gameEngineState)
            expect(loader.appliedResources).toBeTruthy()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
            expect(loader.recommendStateChanges(gameEngineState).nextMode).toBe(
                GameModeEnum.BATTLE
            )
        })
    })
})

const loadCampaignAndMissionFromFiles = async (
    loader: GameEngineGameLoader,
    gameEngineState: GameEngineState
) => {
    await loader.update(gameEngineState)
}

const reactToLoadRequest = async (
    loader: GameEngineGameLoader,
    gameEngineState: GameEngineState
) => {
    await loader.update(gameEngineState)
}

const loadResources = async (
    loader: GameEngineGameLoader,
    gameEngineState: GameEngineState
) => {
    await loadCampaignAndMissionFromFiles(loader, gameEngineState)
    const squaddieRepositorySize =
        ObjectRepositoryService.getBattleSquaddieIterator(
            gameEngineState.repository
        ).length
    await loader.update(gameEngineState)
    return squaddieRepositorySize
}
