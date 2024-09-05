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
import { MissionStatisticsHandler } from "../battle/missionStatistics/missionStatistics"
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
import { LoadSaveStateService } from "../dataLoader/loadSaveState"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { BattleHUDService } from "../battle/hud/battleHUD"
import { LoadCampaignData } from "../utils/fileHandling/loadCampaignData"

describe("GameEngineGameLoader", () => {
    let loader: GameEngineGameLoader
    let missionData: MissionFileFormat
    let campaignFileData: CampaignFileFormat
    let loadFileIntoFormatSpy: jest.SpyInstance
    let gameEngineState: GameEngineState
    let resourceHandler: ResourceHandler
    let squaddieRepository: ObjectRepository
    const campaignId = "coolCampaign"

    beforeEach(() => {
        loader = new GameEngineGameLoader(campaignId)

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValue(true)
        resourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true)
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
            await loader.update(gameEngineState)
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

            await loader.update(gameEngineState)
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
            await loader.update(gameEngineState)
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
            await loader.update(gameEngineState)
            expect(loadFileIntoFormatSpy).toBeCalledWith(
                "assets/mission/0000.json"
            )
        })

        it("knows file has been loaded", async () => {
            await loader.update(gameEngineState)
            expect(
                loader.missionLoaderContext.completionProgress.started
            ).toBeTruthy()
        })

        it("knows it has not gotten resources yet", async () => {
            await loader.update(gameEngineState)
            expect(loader.appliedResources).toBeFalsy()
        })

        it("knows it is not complete", async () => {
            await loader.update(gameEngineState)
            expect(loader.hasCompleted(gameEngineState)).toBeFalsy()
        })

        it("reports errors", async () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {})
            loadFileIntoFormatSpy.mockRejectedValue("Error")
            await loader.update(gameEngineState)
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
            await loader.update(gameEngineState)
            squaddieRepositorySize =
                ObjectRepositoryService.getBattleSquaddieIterator(
                    gameEngineState.repository
                ).length
            await loader.update(gameEngineState)
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
        let openDialogSpy: jest.SpyInstance
        let loadedBattleSaveState: BattleSaveState
        let originalState: GameEngineState
        let currentState: GameEngineState

        beforeEach(() => {
            loader = new GameEngineGameLoader(campaignId)
            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
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
            openDialogSpy = jest
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
                            ...MissionStatisticsHandler.new(),
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
            LoadSaveStateService.userRequestsLoad(
                originalState.fileState.loadSaveState
            )
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
        })

        it("will backup the battle orchestrator gameEngineState", async () => {
            await loader.update(currentState)
            expect(loader.backupBattleOrchestratorState).toEqual(
                originalState.battleOrchestratorState
            )
        })

        it("will try to begin retrieving file content", async () => {
            const retrieveSpy = jest.spyOn(SaveFile, "RetrieveFileContent")
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
            await loader.update(currentState)
            await loader.update(currentState)

            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
        })

        it("should print error message if retrieving a file throws an error", async () => {
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            openDialogSpy = jest
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalledWith(
                "Failed to load progress file from storage."
            )
        })

        it("should abort loading if the applied file is invalid.", async () => {
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            jest.spyOn(
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
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            openDialogSpy = jest
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
        let openDialogSpy: jest.SpyInstance
        let loadedBattleSaveState: BattleSaveState
        let originalState: GameEngineState
        let currentState: GameEngineState

        beforeEach(() => {
            loader = new GameEngineGameLoader(campaignId)
            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
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
            openDialogSpy = jest
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockResolvedValue(loadedBattleSaveState)

            originalState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default(),
            })
            LoadSaveStateService.userRequestsLoad(
                originalState.fileState.loadSaveState
            )
            currentState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                previousMode: GameModeEnum.TITLE_SCREEN,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default(),
            })
            LoadSaveStateService.userRequestsLoad(
                currentState.fileState.loadSaveState
            )
        })

        it("will try to begin retrieving file content", async () => {
            const retrieveSpy = jest.spyOn(SaveFile, "RetrieveFileContent")
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
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            openDialogSpy = jest
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            await loader.update(currentState)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalledWith(
                "Failed to load progress file from storage."
            )
        })

        it("should abort loading if the applied file is invalid.", async () => {
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            jest.spyOn(
                currentState.battleOrchestratorState,
                "isValid",
                "get"
            ).mockReturnValue(false)
            await loader.update(currentState)
            await loader.update(currentState)
            await loader.update(currentState)
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
            let consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation()
            openDialogSpy = jest
                .spyOn(SaveFile, "RetrieveFileContent")
                .mockRejectedValue(null)
            LoadSaveStateService.userRequestsLoad(
                currentState.fileState.loadSaveState
            )
            await loader.update(currentState)
            await loader.update(currentState)
            expect(consoleErrorSpy).toBeCalled()
            expect(openDialogSpy).toBeCalled()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(
                GameModeEnum.TITLE_SCREEN
            )
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            openDialogSpy.mockRestore()
        })
    })

    describe("reloading while game is in progress", () => {
        beforeEach(async () => {
            await loader.update(gameEngineState)
            await loader.update(gameEngineState)
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

            await loader.update(gameEngineState)
            const missionMapCallsCount = 1
            const playerArmyCallsCount = 1
            const playerArmyActionTemplatesCallsCount = 1
            const npcActionTemplatesCallsCount = 1
            const templateCallsCount =
                missionData.npcDeployments.enemy.templateIds.length +
                missionData.npcDeployments.ally.templateIds.length +
                missionData.npcDeployments.noAffiliation.templateIds.length
            expect(loadFileIntoFormatSpy).toBeCalledTimes(
                initialFileLoadCalls +
                    missionMapCallsCount +
                    templateCallsCount +
                    playerArmyCallsCount +
                    playerArmyActionTemplatesCallsCount +
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
            await loader.update(gameEngineState)
            await loader.update(gameEngineState)
            expect(loader.appliedResources).toBeTruthy()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
            expect(loader.recommendStateChanges(gameEngineState).nextMode).toBe(
                GameModeEnum.BATTLE
            )
        })
    })
})
