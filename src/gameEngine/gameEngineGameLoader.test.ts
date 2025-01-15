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
import { GameModeEnum } from "../utils/startupConfig"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { GameEngineState, GameEngineStateService } from "./gameEngine"
import { CampaignFileFormat } from "../campaign/campaignFileFormat"
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
import * as DataLoader from "../dataLoader/dataLoader"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { CutsceneService } from "../cutscene/cutscene"
import { DEFAULT_VICTORY_CUTSCENE_ID } from "../battle/orchestrator/missionCutsceneCollection"
import {
    BattleSaveState,
    DefaultBattleSaveState,
} from "../battle/history/battleSaveState"
import { MissionStatisticsService } from "../battle/missionStatistics/missionStatistics"
import { TriggeringEvent } from "../cutscene/cutsceneTrigger"
import { SaveFile } from "../utils/fileHandling/saveFile"
import { BattleHUDService } from "../battle/hud/battleHUD/battleHUD"
import { BattleCamera } from "../battle/battleCamera"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { MissionObjectiveHelper } from "../battle/missionResult/missionObjective"
import { MissionRewardType } from "../battle/missionResult/missionReward"
import { MissionConditionType } from "../battle/missionResult/missionCondition"
import { CampaignService } from "../campaign/campaign"
import { PlayerDataMessageListener } from "../dataLoader/playerData/playerDataMessageListener"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { BattleCompletionStatus } from "../battle/orchestrator/missionObjectivesAndCutscenes"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { TitleScreenStateHelper } from "../titleScreen/titleScreenState"

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
        resourceHandler.areAllResourcesLoaded = vi.fn().mockReturnValue(true)
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

    describe("Initial load is successful", () => {
        beforeEach(async () => {
            await loader.update(gameEngineState)
        })

        it("loads the campaign", async () => {
            expect(loadFileIntoFormatSpy).toBeCalledWith(
                "assets/campaign/coolCampaign/campaign.json"
            )
        })

        describe("loads army and mission", () => {
            beforeEach(async () => {
                await loader.update(gameEngineState)
            })
            it("loads the player army", async () => {
                expect(loadFileIntoFormatSpy).toBeCalledWith(
                    "assets/playerArmy/playerArmy.json"
                )
            })

            it("loads the mission", async () => {
                expect(loadFileIntoFormatSpy).toBeCalledWith(
                    "assets/campaign/coolCampaign/missions/0000.json"
                )
            })
            describe("waits for resources to load", () => {
                it("begins completion progress for the loader contexts", () => {
                    expect(
                        loader.missionLoaderContext.completionProgress.started
                    ).toBeTruthy()
                })

                it("adds the campaign resources to the pending list", () => {
                    const expectedResourceKeys = [
                        ...Object.values(
                            campaignFileData.resources
                                .missionMapMovementIconResourceKeys
                        ),
                        ...Object.values(
                            campaignFileData.resources
                                .missionMapAttackIconResourceKeys
                        ),
                        ...Object.values(
                            campaignFileData.resources
                                .missionAttributeIconResourceKeys
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
                        ...Object.values(
                            campaignFileData.resources.attributeIcons
                        ),
                    ]

                    expect(
                        loader.campaignLoaderContext.resourcesPendingLoading
                    ).toEqual(expect.arrayContaining(expectedResourceKeys))
                    expect(
                        loader.campaignLoaderContext.resourcesPendingLoading
                    ).toHaveLength(expectedResourceKeys.length)
                })
            })

            describe("when the resources are loaded", () => {
                beforeEach(async () => {
                    await loader.update(gameEngineState)
                })

                it("knows the resources have been loaded", () => {
                    expect(
                        loader.missionLoaderContext.resourcesPendingLoading
                    ).toHaveLength(0)
                })

                describe("when the loaded files are applied to the context", () => {
                    let squaddieRepositorySize: number
                    beforeEach(async () => {
                        squaddieRepositorySize =
                            ObjectRepositoryService.getBattleSquaddieIterator(
                                gameEngineState.repository
                            ).length

                        await loader.update(gameEngineState)
                    })

                    it("applies the loaded file data to create the campaign", () => {
                        expect(gameEngineState.campaign.id).toEqual(
                            campaignFileData.id
                        )
                        expect(gameEngineState.campaign.resources).toEqual(
                            campaignFileData.resources
                        )
                    })

                    describe("applies the loaded file data to create the mission", () => {
                        it("mission id", () => {
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.missionId
                            ).toEqual(missionData.id)
                        })

                        it("mission map", () => {
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.missionMap.terrainTileMap
                            ).toEqual(
                                loader.missionLoaderContext.missionMap
                                    .terrainTileMap
                            )
                        })

                        it("mission objectives", () => {
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.objectives
                            ).toEqual(loader.missionLoaderContext.objectives)
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.missionCompletionStatus
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

                            const templateIds =
                                ObjectRepositoryService.getSquaddieTemplateIterator(
                                    gameEngineState.repository
                                ).map((t) => t.squaddieTemplateId)
                            const playerTemplateIds =
                                missionData.player.deployment.required.map(
                                    (d) => d.squaddieTemplateId
                                )
                            playerTemplateIds.forEach((templateId) => {
                                expect(templateIds).include(templateId)
                            })

                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.teams.length
                            ).toBeGreaterThan(0)

                            expect(
                                gameEngineState.battleOrchestratorState.battleState.teams.some(
                                    (team) =>
                                        team.affiliation ===
                                            SquaddieAffiliation.PLAYER &&
                                        team.id === missionData.player.teamId
                                )
                            ).toBeTruthy()

                            expect(
                                Object.keys(
                                    gameEngineState.battleOrchestratorState
                                        .battleState.teamStrategiesById
                                ).length
                            ).toBeGreaterThan(0)
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.teamStrategiesById[
                                    missionData.npcDeployments.enemy.teams[0].id
                                ]
                            ).toEqual(
                                missionData.npcDeployments.enemy.teams[0]
                                    .strategies
                            )

                            expect(
                                Object.keys(
                                    gameEngineState.repository
                                        .imageUIByBattleSquaddieId
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
                                gameEngineState.battleOrchestratorState
                                    .battleState.cutsceneTriggers.length
                            ).toBeGreaterThan(0)
                            expect(
                                CutsceneService.hasLoaded(
                                    gameEngineState.battleOrchestratorState
                                        .battleState.cutsceneCollection
                                        .cutsceneById[
                                        DEFAULT_VICTORY_CUTSCENE_ID
                                    ],
                                    resourceHandler
                                )
                            ).toBeTruthy()
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
                                gameEngineState.battleOrchestratorState
                                    .battleState.camera.mapDimensionBoundaries
                                    .widthOfWidestRow
                            ).toBe(17)
                            expect(
                                gameEngineState.battleOrchestratorState
                                    .battleState.camera.mapDimensionBoundaries
                                    .numberOfRows
                            ).toBe(18)
                        })
                    })

                    describe("when loading is successful", () => {
                        beforeEach(async () => {
                            while (
                                loader.hasCompleted(gameEngineState) != true
                            ) {
                                await loader.update(gameEngineState)
                            }
                        })
                        it("it has completed", async () => {
                            expect(
                                loader.hasCompleted(gameEngineState)
                            ).toBeTruthy()
                        })
                        it("will recommend Battle mode next", async () => {
                            const changes =
                                loader.recommendStateChanges(gameEngineState)
                            expect(changes.nextMode).toEqual(
                                GameModeEnum.BATTLE
                            )
                        })
                    })
                })
            })
        })
    })

    describe("prints a message and reports an error when the files load", () => {
        let consoleErrorSpy: MockInstance
        beforeEach(() => {
            consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
        })
        afterEach(() => {
            consoleErrorSpy.mockRestore()
        })
        it("fails to load campaign", async () => {
            createLoaderSpyThatCanThrowError(loadFileIntoFormatSpy, [
                "assets/campaign/coolCampaign/campaign.json",
            ])
            await loader.update(gameEngineState)
            expect(loader.status.error).toBeTruthy()
            expect(consoleErrorSpy).toBeCalledWith(
                expect.stringContaining("Error while loading campaign file")
            )
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
        })
        it("fails to load mission", async () => {
            createLoaderSpyThatCanThrowError(loadFileIntoFormatSpy, [
                "assets/campaign/coolCampaign/missions/0000.json",
            ])
            await loader.update(gameEngineState)
            await loader.update(gameEngineState)
            expect(consoleErrorSpy).toBeCalled()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
        })
        it("fails to load player Army", async () => {
            createLoaderSpyThatCanThrowError(loadFileIntoFormatSpy, [
                "assets/playerArmy/playerArmy.json",
            ])
            await loader.update(gameEngineState)
            await loader.update(gameEngineState)
            expect(consoleErrorSpy).toBeCalled()
            expect(loader.hasCompleted(gameEngineState)).toBeTruthy()
        })
    })

    describe("load battle save data mid battle", () => {
        let loadedBattleSaveState: BattleSaveState
        let openDialogSpy: MockInstance
        let originalState: GameEngineState
        let currentState: GameEngineState

        beforeEach(async () => {
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
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
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

        afterEach(() => {
            openDialogSpy.mockRestore()
        })

        it("will open a file dialog", async () => {
            while (loader.hasCompleted(currentState) != true) {
                await loader.update(currentState)
            }
            expect(openDialogSpy).toBeCalled()
        })

        it("will retrieve the save data", async () => {
            const retrieveSpy = vi.spyOn(SaveFile, "RetrieveFileContent")
            while (loader.hasCompleted(currentState) != true) {
                await loader.update(currentState)
            }
            expect(retrieveSpy).toBeCalled()
            retrieveSpy.mockRestore()
        })

        it("will apply the saved data to the battle", async () => {
            currentState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.VICTORY
            currentState.battleOrchestratorState.battleState.battlePhaseState =
                {
                    turnCount: 1,
                    currentAffiliation: BattlePhase.PLAYER,
                }
            while (loader.hasCompleted(currentState) != true) {
                await loader.update(currentState)
            }

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

        it("will tell the file state to clear loading flags", async () => {
            while (loader.hasCompleted(currentState) != true) {
                await loader.update(currentState)
            }
            expect(
                currentState.fileState.loadSaveState.userRequestedLoad
            ).toBeFalsy()
            expect(
                currentState.fileState.loadSaveState.applicationStartedLoad
            ).toBeFalsy()
        })

        describe("error while loading save file", () => {
            let consoleErrorSpy: MockInstance
            beforeEach(() => {
                consoleErrorSpy = vi
                    .spyOn(console, "error")
                    .mockImplementation(() => {})
            })

            afterEach(() => {
                consoleErrorSpy.mockRestore()
            })

            it("should print error message if retrieving a file throws an error", async () => {
                openDialogSpy = vi
                    .spyOn(SaveFile, "RetrieveFileContent")
                    .mockRejectedValue(null)
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(loader.status.error).toBeTruthy()
                expect(consoleErrorSpy).toBeCalledWith(
                    "Failed to load progress file from storage."
                )
            })

            it("should print error message if the loaded file is invalid", async () => {
                const validSpy = vi
                    .spyOn(
                        currentState.battleOrchestratorState,
                        "isValid",
                        "get"
                    )
                    .mockReturnValue(false)

                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(loader.status.error).toBeTruthy()
                expect(consoleErrorSpy).toBeCalledWith(
                    "Save file is incompatible. Reverting."
                )
                expect(validSpy).toBeCalled()
                validSpy.mockRestore()
            })

            describe("battle is restored if retrieve fails", () => {
                const tests = [
                    {
                        reason: "error",
                        rejectedValue: null,
                    },
                    {
                        reason: "user canceled",
                        rejectedValue: new Error("user canceled"),
                    },
                ]

                const setup = async (rejectedValue: Error | null) => {
                    openDialogSpy = vi
                        .spyOn(SaveFile, "RetrieveFileContent")
                        .mockRejectedValue(rejectedValue)
                    while (loader.hasCompleted(currentState) != true) {
                        await loader.update(currentState)
                    }
                }

                it.each(tests)(
                    `reverts the campaign to the original: $reason) `,
                    ({ rejectedValue }) => {
                        setup(rejectedValue)
                        expect(currentState.campaign.id).toEqual(
                            originalState.campaign.id
                        )
                    }
                )

                it.each(tests)(
                    `reverts the mission to the original: $reason) `,
                    ({ rejectedValue }) => {
                        setup(rejectedValue)
                        expect(
                            currentState.battleOrchestratorState.battleState
                                .missionId
                        ).toEqual(
                            originalState.battleOrchestratorState.battleState
                                .missionId
                        )

                        expect(
                            currentState.battleOrchestratorState.battleState
                                .missionStatistics.timeElapsedInMilliseconds
                        ).toEqual(
                            originalState.battleOrchestratorState.battleState
                                .missionStatistics.timeElapsedInMilliseconds
                        )
                    }
                )

                it.each(tests)(
                    `recommends battle mode: $reason) `,
                    ({ rejectedValue }) => {
                        setup(rejectedValue)
                        expect(
                            loader.recommendStateChanges(currentState).nextMode
                        ).toBe(GameModeEnum.BATTLE)
                    }
                )
            })

            describe("battle is restored if the user cancels", () => {
                beforeEach(async () => {
                    openDialogSpy = vi
                        .spyOn(SaveFile, "RetrieveFileContent")
                        .mockRejectedValue(new Error("user canceled"))
                    while (loader.hasCompleted(currentState) != true) {
                        await loader.update(currentState)
                    }
                })

                it("reverts the campaign to the original", () => {
                    expect(currentState.campaign.id).toEqual(
                        originalState.campaign.id
                    )
                })

                it("reverts the mission to the original", () => {
                    expect(
                        currentState.battleOrchestratorState.battleState
                            .missionId
                    ).toEqual(
                        originalState.battleOrchestratorState.battleState
                            .missionId
                    )

                    expect(
                        currentState.battleOrchestratorState.battleState
                            .missionStatistics.timeElapsedInMilliseconds
                    ).toEqual(
                        originalState.battleOrchestratorState.battleState
                            .missionStatistics.timeElapsedInMilliseconds
                    )
                })

                it("recommends battle mode", () => {
                    expect(
                        loader.recommendStateChanges(currentState).nextMode
                    ).toBe(GameModeEnum.BATTLE)
                })
            })
        })

        describe("reloading the same campaign while game is in progress", () => {
            let retrieveSpy: MockInstance
            beforeEach(async () => {
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
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

            it("will not reload the campaign", async () => {
                loadFileIntoFormatSpy.mockClear()
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(retrieveSpy).toHaveBeenCalled()
                const calls = loadFileIntoFormatSpy.mock.calls.filter(
                    (call) =>
                        call[0] === "assets/campaign/coolCampaign/campaign.json"
                )
                expect(calls).toHaveLength(0)
            })

            it("will switch to battle mode once resources have finished loading", async () => {
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(loader.hasCompleted(currentState)).toBeTruthy()
                expect(
                    loader.recommendStateChanges(currentState).nextMode
                ).toBe(GameModeEnum.BATTLE)
            })
        })
    })

    describe("load battle save data on title screen", () => {
        let loadedBattleSaveState: BattleSaveState
        let openDialogSpy: MockInstance
        let originalState: GameEngineState
        let currentState: GameEngineState
        beforeEach(async () => {
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
                titleScreenState: { ...originalState.titleScreenState },
                battleOrchestratorState:
                    originalState.battleOrchestratorState.clone(),
                campaign: { ...originalState.campaign },
                repository: originalState.repository,
                resourceHandler: originalState.resourceHandler,
                previousMode: GameModeEnum.TITLE_SCREEN,
            })
            const playerDataMessageListener: PlayerDataMessageListener =
                new PlayerDataMessageListener("listener")
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            currentState.messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
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

            while (loader.hasCompleted(currentState) != true) {
                await loader.update(currentState)
            }

            expect(consoleErrorSpy).toBeCalled()
            expect(openDialogSpy).toBeCalled()
            expect(loader.hasCompleted(currentState)).toBeTruthy()
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(
                GameModeEnum.TITLE_SCREEN
            )
            openDialogSpy.mockRestore()
            consoleErrorSpy.mockRestore()
        })

        describe("Load a different campaign", () => {
            let retrieveSpy: MockInstance
            let newLoadedBattleSaveState: BattleSaveState

            beforeEach(async () => {
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }

                newLoadedBattleSaveState = {
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
                    .mockResolvedValue(newLoadedBattleSaveState)
                currentState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                    loadSaveState: currentState.fileState.loadSaveState,
                })
            })

            afterEach(() => {
                retrieveSpy.mockRestore()
            })

            it("will open the dialog", async () => {
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(retrieveSpy).toBeCalled()
                expect(openDialogSpy).toBeCalled()
            })

            it("will try to load the new campaign", async () => {
                while (loader.hasCompleted(currentState) != true) {
                    await loader.update(currentState)
                }
                expect(loadFileIntoFormatSpy).toBeCalledWith(
                    "assets/campaign/theNewCampaign/campaign.json"
                )
                expect(currentState.campaign.id).toEqual("theNewCampaign")
            })
        })
    })
})

const createLoaderSpyThatCanThrowError = (
    originalLoadFileIntoFormatSpy: MockInstance,
    throwErrorIfFileNamesAreLoaded: string[]
): MockInstance => {
    return vi
        .spyOn(DataLoader, "LoadFileIntoFormat")
        .mockImplementation((filename: string) => {
            if (throwErrorIfFileNamesAreLoaded.includes(filename)) {
                return Promise.reject("Error")
            }
            return originalLoadFileIntoFormatSpy.getMockImplementation()(
                filename
            )
        })
}
