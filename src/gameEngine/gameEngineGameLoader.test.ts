import {GameEngineGameLoader} from "./gameEngineGameLoader";
import {ResourceHandler} from "../resource/resourceHandler";
import * as mocks from "./../utils/test/mocks";
import * as DataLoader from "../dataLoader/dataLoader";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {MissionFileFormat} from "../dataLoader/missionLoader";
import {MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";
import {DEFAULT_VICTORY_CUTSCENE_ID} from "../battle/orchestrator/missionCutsceneCollection";
import {GameModeEnum} from "../utils/startupConfig";
import {BattleSaveState, DefaultBattleSaveState} from "../battle/history/battleSaveState";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {MissionObjectiveHelper} from "../battle/missionResult/missionObjective";
import {MissionStatisticsHandler} from "../battle/missionStatistics/missionStatistics";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {BattleCamera} from "../battle/battleCamera";
import {TriggeringEvent} from "../cutscene/cutsceneTrigger";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../battle/hud/battleSquaddieSelectedHUD";
import {BattleCompletionStatus} from "../battle/orchestrator/missionObjectivesAndCutscenes";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {TitleScreenStateHelper} from "../titleScreen/titleScreenState";
import {GameEngineState, GameEngineStateService} from "./gameEngine";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {TestMissionData} from "../utils/test/missionData";
import {TestArmyPlayerData} from "../utils/test/army";
import {PlayerArmy} from "../campaign/playerArmy";
import {CutsceneService} from "../cutscene/cutscene";
import {CampaignService} from "../campaign/campaign";
import {CampaignFileFormat} from "../campaign/campaignFileFormat";
import {TestCampaignData} from "../utils/test/campaignData";
import {LoadSaveStateService} from "../dataLoader/loadSaveState";
import {SaveSaveStateService} from "../dataLoader/saveSaveState";
import {BattleHUDService} from "../battle/hud/battleHUD";

describe('GameEngineGameLoader', () => {
    let loader: GameEngineGameLoader;
    let missionData: MissionFileFormat;
    let campaignFileData: CampaignFileFormat;
    let loadFileIntoFormatSpy: jest.SpyInstance;
    let state: GameEngineState;
    let resourceHandler: ResourceHandler;
    let squaddieRepository: ObjectRepository;
    let playerArmy: PlayerArmy;

    beforeEach(() => {
        loader = new GameEngineGameLoader("coolCampaign");

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
        resourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true);
        squaddieRepository = ObjectRepositoryService.new();

        state = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

                battleState: BattleStateService.newBattleState({
                    missionId: "",
                }),
            }),
        });

        let enemyDemonSlitherTemplate: SquaddieTemplate;
        let enemyDemonSlitherTemplate2: SquaddieTemplate;
        ({
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
        } = TestMissionData());

        ({
            playerArmy
        } = TestArmyPlayerData());

        ({
            campaignFile: campaignFileData,
        } = TestCampaignData());

        loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockImplementation(async (filename: string): Promise<MissionFileFormat | SquaddieTemplate | PlayerArmy | CampaignFileFormat> => {
            if (filename === "assets/mission/0000.json") {
                return missionData;
            }

            if (filename === "assets/npcData/templates/enemy_demon_slither.json") {
                return enemyDemonSlitherTemplate;
            }

            if (filename === "assets/npcData/templates/enemyDemonSlitherTemplate2_id.json") {
                return enemyDemonSlitherTemplate2;
            }

            if (filename === "assets/playerArmy/playerArmy.json") {
                return playerArmy;
            }

            if (filename === "assets/campaign/coolCampaign/campaign.json") {
                return campaignFileData;
            }
        });
    });

    describe('loading the campaign', () => {
        it('loads the campaign first', async () => {
            await loader.update(state);
            expect(loadFileIntoFormatSpy).toBeCalledWith("assets/campaign/coolCampaign/campaign.json");
        });
        it('adds the campaign resources to the pending list', async () => {
            const expectedResourceKeys = [
                ...Object.values(campaignFileData.resources.missionMapMovementIconResourceKeys),
                ...Object.values(campaignFileData.resources.missionMapAttackIconResourceKeys),
                ...Object.values(campaignFileData.resources.missionAttributeIconResourceKeys),
                ...Object.values(campaignFileData.resources.actionEffectSquaddieTemplateButtonIcons),
            ];

            await loader.update(state);
            expect(state.resourceHandler.areAllResourcesLoaded(expectedResourceKeys)).toBeFalsy();
            expect(loader.campaignLoaderContext.resourcesPendingLoading).toHaveLength(expectedResourceKeys.length);
        });
        it('knows it has not gotten resources yet', () => {
            loader.update(state);
            expect(loader.appliedResources).toBeFalsy();
        });
        it('knows it is not complete', () => {
            expect(loader.hasCompleted(state)).toBeFalsy();
            loader.update(state);
            expect(loader.hasCompleted(state)).toBeFalsy();
        });
    });

    describe('loading the mission', () => {
        it('asks the loader to load the mission', async () => {
            await loader.update(state);
            expect(loadFileIntoFormatSpy).toBeCalledWith("assets/mission/0000.json");
        });

        it('knows file has been loaded', async () => {
            await loader.update(state);
            expect(loader.missionLoaderContext.completionProgress.started).toBeTruthy();
        });

        it('knows it has not gotten resources yet', () => {
            loader.update(state);
            expect(loader.appliedResources).toBeFalsy();
        });

        it('knows it is not complete', () => {
            loader.update(state);
            expect(loader.hasCompleted(state)).toBeFalsy();
        });
    });

    describe('will wait for the resources to load before finishing', () => {
        let squaddieRepositorySize: number;

        beforeEach(async () => {
            await loader.update(state);
            squaddieRepositorySize = ObjectRepositoryService.getBattleSquaddieIterator(state.repository).length;
            await loader.update(state);
        });

        it('should load resources into the handler', () => {
            expect(loader.missionLoaderContext.resourcesPendingLoading).toHaveLength(0);
        });

        it('should be complete', () => {
            expect(loader.appliedResources).toBeTruthy();
            expect(loader.hasCompleted(state)).toBeTruthy();
        });

        it('should recommend the battle scene as the next object', () => {
            expect(loader.recommendStateChanges(state).nextMode).toBe(GameModeEnum.BATTLE);
        });

        it('mission id', () => {
            expect(state.battleOrchestratorState.battleState.missionId).toEqual(missionData.id);
        });

        it('mission map', () => {
            expect(state.battleOrchestratorState.battleState.missionMap.terrainTileMap).toEqual(loader.missionLoaderContext.missionMap.terrainTileMap);
        });

        it('mission objectives', () => {
            expect(state.battleOrchestratorState.battleState.objectives).toEqual(loader.missionLoaderContext.objectives);
            expect(state.battleOrchestratorState.battleState.missionCompletionStatus).toEqual({
                    "victory": {
                        isComplete: undefined,
                        conditions:
                            {
                                "defeat_all_enemies": undefined,
                            }
                    },
                    "defeat": {
                        isComplete: undefined,
                        conditions:
                            {
                                "defeat_all_players": undefined,
                            }
                    }
                }
            );
        });

        it('squaddies', () => {
            expect(ObjectRepositoryService.getSquaddieTemplateIterator(state.repository).length).toBeGreaterThan(0);
            expect(state.battleOrchestratorState.battleState.teams.length).toBeGreaterThan(0);

            expect(state.battleOrchestratorState.battleState.teams.some(
                team =>
                    team.affiliation === SquaddieAffiliation.PLAYER
                    && team.id === missionData.player.teamId)
            ).toBeTruthy();

            expect(Object.keys(state.battleOrchestratorState.battleState.teamStrategiesById).length).toBeGreaterThan(0);
            expect(state.battleOrchestratorState.battleState.teamStrategiesById[missionData.enemy.teams[0].id]).toEqual(
                missionData.enemy.teams[0].strategies
            );

            expect(Object.keys(state.repository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepositorySize);
        });

        it('cutscenes', () => {
            expect(state.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(
                CutsceneService.hasLoaded(
                    state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID],
                    resourceHandler,
                )
            ).toBeTruthy();
        });

        it('campaign resources', () => {
            expect(state.campaign.resources).toEqual(campaignFileData.resources);
        });

        it('initializes the camera', () => {
            expect(loader.missionLoaderContext.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(loader.missionLoaderContext.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);

            expect(state.battleOrchestratorState.battleState.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(state.battleOrchestratorState.battleState.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });
    });

    describe('user wants to load a file while in BattleOrchestrator mode', () => {
        let openDialogSpy: jest.SpyInstance;
        let loadedBattleSaveState: BattleSaveState;
        let originalState: GameEngineState;
        let currentState: GameEngineState;

        beforeEach(() => {
            loader = new GameEngineGameLoader("coolCampaign");
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
                        iconResourceKey: ""
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
                    }
                ],
            };
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockResolvedValue(
                loadedBattleSaveState
            );

            originalState = GameEngineStateService.new({
                repository: squaddieRepository,
                previousMode: GameModeEnum.BATTLE,
                resourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleHUD: BattleHUDService.new({
                            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                        }),
                        battleState: BattleStateService.newBattleState({
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
                                    reward: {rewardType: MissionRewardType.VICTORY},
                                    hasGivenReward: false,
                                    numberOfRequiredConditionsToComplete: 1,
                                    conditions: [
                                        {
                                            id: "test",
                                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                        }
                                    ],

                                })
                            ],
                            cutsceneTriggers: [
                                {
                                    cutsceneId: "introductory",
                                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                                    turn: 0,
                                    systemReactedToTrigger: true,
                                }
                            ],
                            missionCompletionStatus: {},
                        }),
                    }),
                campaign: CampaignService.default({}),
            });
            LoadSaveStateService.userRequestsLoad(originalState.fileState.loadSaveState);
            currentState = GameEngineStateService.new({
                titleScreenState: {...originalState.titleScreenState},
                battleOrchestratorState: originalState.battleOrchestratorState.clone(),
                campaign: {...originalState.campaign},
                repository: originalState.repository,
                resourceHandler: originalState.resourceHandler,
            });
            currentState.modeThatInitiatedLoading = originalState.modeThatInitiatedLoading;
            currentState.fileState.saveSaveState = SaveSaveStateService.clone(originalState.fileState.saveSaveState);
            currentState.fileState.loadSaveState = LoadSaveStateService.clone(originalState.fileState.loadSaveState);
            currentState.campaignIdThatWasLoaded = originalState.campaignIdThatWasLoaded;
        });

        it('will backup the battle orchestrator state', async () => {
            await loader.update(currentState);
            expect(loader.backupBattleOrchestratorState).toEqual(originalState.battleOrchestratorState);
        });

        it('will try to begin retrieving file content', async () => {
            const retrieveSpy = jest.spyOn(SaveFile, "RetrieveFileContent");
            await loader.update(currentState);
            expect(retrieveSpy).toBeCalled();
        });

        it('will try to open a file dialog', async () => {
            await loader.update(currentState);
            expect(openDialogSpy).toBeCalled();
        });

        it('will save the loaded save data', async () => {
            await loader.update(currentState);
            expect(loader.loadedBattleSaveState).toEqual(loadedBattleSaveState);
        });

        it('will try to apply the saved data', async () => {
            currentState.battleOrchestratorState.battleState.battleCompletionStatus = BattleCompletionStatus.VICTORY;
            currentState.battleOrchestratorState.battleState.battlePhaseState = {
                turnCount: 1,
                currentAffiliation: BattlePhase.PLAYER,
            };
            await loader.update(currentState);
            await loader.update(currentState);
            expect(loader.missionLoaderContext.resourcesPendingLoading).toHaveLength(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(
                CutsceneService.hasLoaded(
                    state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID],
                    resourceHandler,
                )
            ).toBeTruthy();
            expect(currentState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(1);
            expect(currentState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);
            expect(currentState.battleOrchestratorState.battleState.battlePhaseState).toEqual({
                turnCount: 0,
                currentAffiliation: BattlePhase.UNKNOWN,
            });

            expect(currentState.battleOrchestratorState.missingComponents).toHaveLength(0);
            expect(currentState.battleOrchestratorState.isValid).toBeTruthy();
        });

        it('will mark the save as complete', async () => {
            await loader.update(currentState);
            await loader.update(currentState);

            expect(currentState.fileState.loadSaveState.userRequestedLoad).toBeFalsy();
            expect(currentState.fileState.loadSaveState.applicationStartedLoad).toBeFalsy();
            expect(loader.hasCompleted(currentState)).toBeTruthy();
        });

        it('should print error message if retrieving a file throws an error', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockRejectedValue(
                null
            );
            await loader.update(currentState);
            expect(consoleErrorSpy).toBeCalledWith("Failed to load progress file from storage.");
        });

        it('should abort loading if the applied file is invalid.', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            jest.spyOn(currentState.battleOrchestratorState, "isValid", "get").mockReturnValue(false);
            await loader.update(currentState);
            expect(loader.backupBattleOrchestratorState).toEqual(originalState.battleOrchestratorState);
            await loader.update(currentState);
            expect(currentState.fileState.loadSaveState.userRequestedLoad).toBeFalsy();
            expect(currentState.fileState.loadSaveState.applicationStartedLoad).toBeFalsy();
            expect(loader.errorFoundWhileLoading).toBeTruthy();

            expect(currentState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toEqual(originalState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds);

            expect(consoleErrorSpy).toBeCalledWith("Save file is incompatible. Reverting.");
            expect(loader.hasCompleted(currentState)).toBeTruthy();
        });

        it('will be complete and return to battle mode if there is an error', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockRejectedValue(
                null
            );
            await loader.update(currentState);
            expect(consoleErrorSpy).toBeCalled();
            expect(loader.hasCompleted(currentState)).toBeTruthy();
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(GameModeEnum.BATTLE);
        });
    });

    describe('user wants to load a file while in TitleScreen mode', () => {
        let openDialogSpy: jest.SpyInstance;
        let loadedBattleSaveState: BattleSaveState;
        let originalState: GameEngineState;
        let currentState: GameEngineState;

        beforeEach(() => {
            loader = new GameEngineGameLoader("coolCampaign");
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
                    }
                ],
            };
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockResolvedValue(
                loadedBattleSaveState
            );

            originalState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default({}),
            });
            LoadSaveStateService.userRequestsLoad(originalState.fileState.loadSaveState);
            currentState = GameEngineStateService.new({
                repository: ObjectRepositoryService.new(),
                previousMode: GameModeEnum.TITLE_SCREEN,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({}),
                titleScreenState: TitleScreenStateHelper.new(),
                campaign: CampaignService.default({}),
            });
            LoadSaveStateService.userRequestsLoad(currentState.fileState.loadSaveState);
        });

        it('will try to begin retrieving file content', async () => {
            const retrieveSpy = jest.spyOn(SaveFile, "RetrieveFileContent");
            await loader.update(currentState);
            await loader.update(currentState);
            expect(retrieveSpy).toBeCalled();
        });

        it('will try to open a file dialog', async () => {
            await loader.update(currentState);
            await loader.update(currentState);
            expect(openDialogSpy).toBeCalled();
        });

        it('will save the loaded save data', async () => {
            await loader.update(currentState);
            await loader.update(currentState);
            expect(loader.loadedBattleSaveState).toEqual(loadedBattleSaveState);
        });

        it('will try to apply the saved data', async () => {
            await loader.update(currentState);
            await loader.update(currentState);
            await loader.update(currentState);
            expect(loader.missionLoaderContext.resourcesPendingLoading).toHaveLength(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(
                CutsceneService.hasLoaded(
                    state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID],
                    resourceHandler,
                )
            ).toBeTruthy();
            expect(currentState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(1);
            expect(currentState.battleOrchestratorState.battleState.battleCompletionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);
            expect(currentState.battleOrchestratorState.battleState.battlePhaseState).toEqual({
                turnCount: 0,
                currentAffiliation: BattlePhase.UNKNOWN,
            });

            expect(currentState.battleOrchestratorState.missingComponents).toHaveLength(0);
            expect(currentState.battleOrchestratorState.isValid).toBeTruthy();
        });

        it('will mark the save as complete', async () => {
            await loader.update(currentState);
            await loader.update(currentState);
            await loader.update(currentState);

            expect(currentState.fileState.loadSaveState.applicationStartedLoad).toBeFalsy();
            expect(currentState.fileState.loadSaveState.userRequestedLoad).toBeFalsy();
            expect(loader.hasCompleted(currentState)).toBeTruthy();
        });

        it('should print error message if retrieving a file throws an error', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockRejectedValue(
                null
            );
            await loader.update(currentState);
            await loader.update(currentState);
            expect(consoleErrorSpy).toBeCalledWith("Failed to load progress file from storage.");
        });

        it('should abort loading if the applied file is invalid.', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            jest.spyOn(currentState.battleOrchestratorState, "isValid", "get").mockReturnValue(false);
            await loader.update(currentState);
            await loader.update(currentState);
            await loader.update(currentState);
            expect(currentState.fileState.loadSaveState.applicationStartedLoad).toBeFalsy();
            expect(currentState.fileState.loadSaveState.userRequestedLoad).toBeFalsy();
            expect(loader.errorFoundWhileLoading).toBeTruthy();

            expect(currentState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds).toEqual(originalState.battleOrchestratorState.battleState.missionStatistics.timeElapsedInMilliseconds);

            expect(consoleErrorSpy).toBeCalledWith("Save file is incompatible. Reverting.");
            expect(loader.hasCompleted(currentState)).toBeTruthy();
        });

        it('will be complete and return to title screen mode if there is an error', async () => {
            let consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockRejectedValue(
                null
            );
            await loader.update(currentState);
            await loader.update(currentState);
            expect(consoleErrorSpy).toBeCalled();
            expect(loader.hasCompleted(currentState)).toBeTruthy();
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(GameModeEnum.TITLE_SCREEN);
        });
    });

    describe('reloading while game is in progress', () => {
        beforeEach(async () => {
            await loader.update(state);
            await loader.update(state);
        });

        const resetLoaderAndClearBattleOrchestratorState = () => {
            loader.reset(state);
            state.battleOrchestratorState.copyOtherOrchestratorState(BattleOrchestratorStateService.newOrchestratorState({}));
        }

        it('will persist the campaign loading context by default', () => {
            expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual("coolCampaign");
            loader.reset(state);
            expect(loader.campaignLoaderContext.campaignIdToLoad).toEqual("coolCampaign");
        });

        it('will load battle resources again but nothing else', async () => {
            expect(loader.appliedResources).toBeTruthy();
            expect(loader.hasCompleted(state)).toBeTruthy();
            const initialFileLoadCalls = loadFileIntoFormatSpy.mock.calls.length;

            resetLoaderAndClearBattleOrchestratorState();

            await loader.update(state);
            const missionMapCallsCount = 1;
            const playerArmyCallsCount = 1;
            const templateCallsCount = missionData.enemy.templateIds.length;
            expect(loadFileIntoFormatSpy).toBeCalledTimes(
                initialFileLoadCalls
                + missionMapCallsCount
                + templateCallsCount
                + playerArmyCallsCount
            );
            expect(loader.missionLoaderContext.completionProgress.started).toBeTruthy();
            expect(loader.missionLoaderContext.completionProgress.loadedFileData).toBeTruthy();
            expect(loader.appliedResources).toBeFalsy();
            expect(loader.hasCompleted(state)).toBeFalsy();
        });

        it('will switch to battle mode once resources have finished loading', async () => {
            resetLoaderAndClearBattleOrchestratorState();
            await loader.update(state);
            await loader.update(state);
            expect(loader.appliedResources).toBeTruthy();
            expect(loader.hasCompleted(state)).toBeTruthy();
            expect(loader.recommendStateChanges(state).nextMode).toBe(GameModeEnum.BATTLE);
        });
    });
});
