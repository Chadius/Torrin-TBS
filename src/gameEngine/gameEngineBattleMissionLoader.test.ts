import {GameEngineBattleMissionLoader} from "./gameEngineBattleMissionLoader";
import {ResourceHandler} from "../resource/resourceHandler";
import * as mocks from "./../utils/test/mocks";
import * as DataLoader from "../dataLoader/dataLoader";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {BattleOrchestratorStateHelper} from "../battle/orchestrator/battleOrchestratorState";
import {MissionFileFormat} from "../dataLoader/missionLoader";
import {MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";
import {
    MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
    MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS
} from "../battle/loading/missionLoader";
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
import {BattleStateHelper} from "../battle/orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../battle/battleSquaddieSelectedHUD";
import {BattleCompletionStatus} from "../battle/orchestrator/missionObjectivesAndCutscenes";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {TitleScreenStateHelper} from "../titleScreen/titleScreenState";
import {GameEngineState, GameEngineStateHelper} from "./gameEngine";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {TestMissionData} from "../utils/test/missionData";

describe('GameEngineBattleMissionLoader', () => {
    let loader: GameEngineBattleMissionLoader;
    let missionData: MissionFileFormat;
    let missionLoadSpy: jest.SpyInstance;
    let state: GameEngineState;
    let resourceHandler: ResourceHandler;
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        loader = new GameEngineBattleMissionLoader();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
        resourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true);
        squaddieRepository = new BattleSquaddieRepository();

        state = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler,
                squaddieRepository,
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "",
                }),
            })
        });

        let enemyDemonSlitherTemplate: SquaddieTemplate;
        let enemyDemonSlitherTemplate2: SquaddieTemplate;
        ({
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
        } = TestMissionData());

        missionLoadSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockImplementation(async (filename: string): Promise<MissionFileFormat | SquaddieTemplate> => {
            if (filename === "assets/mission/0000.json") {
                return missionData;
            }

            if (filename === "assets/npcData/templates/enemy_demon_slither.json") {
                return enemyDemonSlitherTemplate;
            }

            if (filename === "assets/npcData/templates/enemyDemonSlitherTemplate2_id.json") {
                return enemyDemonSlitherTemplate2;
            }
        });
    });

    it('asks the mission loader to load the mission', async () => {
        await loader.update(state);
        expect(missionLoadSpy).toBeCalled();
    });

    it('knows file has been loaded', async () => {
        await loader.update(state);
        expect(loader.missionLoaderStatus.completionProgress.started).toBeTruthy();
        expect(loader.missionLoaderStatus.completionProgress.loadedFileData).toBeTruthy();
    });

    it('knows it has not gotten resources yet', () => {
        loader.update(state);
        expect(loader.appliedResources).toBeFalsy();
    });

    it('knows it is not complete', () => {
        loader.update(state);
        expect(loader.hasCompleted(state)).toBeFalsy();
    });

    describe('will wait for the resources to load before finishing', () => {
        let squaddieRepositorySize: number;

        beforeEach(async () => {
            await loader.update(state);
            squaddieRepositorySize = state.battleOrchestratorState.squaddieRepository.getBattleSquaddieIterator().length;
            await loader.update(state);
        });

        it('should load resources into the handler', () => {
            expect(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS).toHaveLength(2);
            expect(state.battleOrchestratorState.resourceHandler.areAllResourcesLoaded([
                ...MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
                ...MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
            ])).toBeTruthy();

            expect(loader.missionLoaderStatus.resourcesPendingLoading).toHaveLength(0);
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
            expect(state.battleOrchestratorState.battleState.missionMap.terrainTileMap).toEqual(loader.missionLoaderStatus.missionMap.terrainTileMap);
        });

        it('mission objectives', () => {
            expect(state.battleOrchestratorState.battleState.objectives).toEqual(loader.missionLoaderStatus.objectives);
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
            expect(state.battleOrchestratorState.squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
            expect(state.battleOrchestratorState.battleState.teams.length).toBeGreaterThan(0);

            expect(Object.keys(state.battleOrchestratorState.battleState.teamStrategiesById).length).toBeGreaterThan(0);
            expect(state.battleOrchestratorState.battleState.teamStrategiesById[missionData.enemy.teams[0].id]).toEqual(
                missionData.enemy.teams[0].strategies
            );

            expect(Object.keys(state.battleOrchestratorState.squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepositorySize);
        });

        it('cutscenes', () => {
            expect(state.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });

        it('initializes the camera', () => {
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);

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
            loader = new GameEngineBattleMissionLoader();
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

            originalState = GameEngineStateHelper.new({
                previousMode: GameModeEnum.BATTLE,
                battleOrchestratorState:
                    BattleOrchestratorStateHelper.newOrchestratorState({
                        squaddieRepository,
                        resourceHandler,
                        battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                        battleState: BattleStateHelper.newBattleState({
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
                    })
            });
            originalState.gameSaveFlags.loadRequested = true;
            currentState = GameEngineStateHelper.clone({original: originalState});
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
            expect(loader.missionLoaderStatus.resourcesPendingLoading).toHaveLength(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
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

            expect(currentState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(currentState.gameSaveFlags.loadingInProgress).toBeFalsy();
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
            expect(currentState.gameSaveFlags.loadingInProgress).toBeFalsy();
            expect(currentState.gameSaveFlags.loadRequested).toBeFalsy();
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
            loader = new GameEngineBattleMissionLoader();
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

            originalState = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    resourceHandler,
                    squaddieRepository: new BattleSquaddieRepository(),
                }),
                titleScreenState: TitleScreenStateHelper.new()
            });
            originalState.gameSaveFlags.loadRequested = true;
            currentState = GameEngineStateHelper.new({
                previousMode: GameModeEnum.TITLE_SCREEN,
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    resourceHandler,
                    squaddieRepository: new BattleSquaddieRepository(),
                }),
                titleScreenState: TitleScreenStateHelper.new()
            });
            currentState.gameSaveFlags.loadRequested = true;
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
            await loader.update(currentState);
            await loader.update(currentState);
            expect(loader.missionLoaderStatus.resourcesPendingLoading).toHaveLength(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(currentState.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
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

            expect(currentState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(currentState.gameSaveFlags.loadingInProgress).toBeFalsy();
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
            await loader.update(currentState);
            expect(currentState.gameSaveFlags.loadingInProgress).toBeFalsy();
            expect(currentState.gameSaveFlags.loadRequested).toBeFalsy();
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
            expect(consoleErrorSpy).toBeCalled();
            expect(loader.hasCompleted(currentState)).toBeTruthy();
            expect(loader.recommendStateChanges(currentState).nextMode).toBe(GameModeEnum.TITLE_SCREEN);
        });
    });

    it('will try to load once then wait for resources, even after completing once', async () => {
        await loader.update(state);
        await loader.update(state);

        expect(loader.appliedResources).toBeTruthy();
        expect(loader.hasCompleted(state)).toBeTruthy();
        const missionLoadSpyCalls = missionLoadSpy.mock.calls.length;

        loader.reset(state);
        state.battleOrchestratorState.copyOtherOrchestratorState(BattleOrchestratorStateHelper.newOrchestratorState({resourceHandler}));

        await loader.update(state);
        const missionMapCallsCount = 1;
        const templateCallsCount = missionData.enemy.templateIds.length;
        expect(missionLoadSpy).toBeCalledTimes(
            missionLoadSpyCalls
            + missionMapCallsCount
            + templateCallsCount
        );
        expect(loader.missionLoaderStatus.completionProgress.started).toBeTruthy();
        expect(loader.missionLoaderStatus.completionProgress.loadedFileData).toBeTruthy();
        expect(loader.appliedResources).toBeFalsy();
        expect(loader.hasCompleted(state)).toBeFalsy();

        await loader.update(state);
        expect(loader.appliedResources).toBeTruthy();
        expect(loader.hasCompleted(state)).toBeTruthy();
        expect(loader.recommendStateChanges(state).nextMode).toBe(GameModeEnum.BATTLE);
    });
});
