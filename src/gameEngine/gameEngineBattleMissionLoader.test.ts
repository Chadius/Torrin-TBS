import {GameEngineBattleMissionLoader} from "./gameEngineBattleMissionLoader";
import {ResourceHandler} from "../resource/resourceHandler";
import * as mocks from "./../utils/test/mocks";
import * as DataLoader from "../dataLoader/dataLoader";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
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

describe('GameEngineBattleMissionLoader', () => {
    let loader: GameEngineBattleMissionLoader;
    let missionData: MissionFileFormat;
    let missionLoadSpy: jest.SpyInstance;
    let state: BattleOrchestratorState;
    let resourceHandler: ResourceHandler;
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        loader = new GameEngineBattleMissionLoader();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
        resourceHandler.isResourceLoaded = jest.fn().mockReturnValue(true);
        squaddieRepository = new BattleSquaddieRepository();

        state = new BattleOrchestratorState({
            resourceHandler,
            squaddieRepository,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({}),
        });

        missionData = {
            "terrain": [
                "x x x x x 2 2 1 1 1 1 1 2 2 x x x ",
                " 1 1 1 1 2 2 2 1 1 1 1 2 2 1 1 1 1 ",
                "  x x x x 2 2 1 1 1 1 1 2 2 1 1 1 1 ",
                "   x x x x x x x x x x x x x x 1 1 1 ",
                "    1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                "     1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                "      1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 ",
                "       1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 1 ",
                "        x x x x x x x x x x x 2 1 1 1 1 1 ",
                "         1 1 1 1 1 1 x 2 2 2 1 1 1 1 2 2 2 ",
                "          1 1 1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 ",
                "           1 1 1 1 x 2 1 1 1 2 2 2 1 1 1 1 2 ",
                "            1 1 1 x 2 1 1 1 1 O O 1 1 1 1 1 2 ",
                "             1 1 1 x 2 1 1 1 O O O 1 1 1 1 1 2 ",
                "              1 1 1 x 2 1 1 1 O O 1 1 1 1 1 1 2 ",
                "               1 1 1 x 2 1 1 1 1 1 1 1 1 1 1 2 x ",
                "                1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 x 1 ",
                "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 "
            ],
            "objectives": [
                {
                    "id": "victory",
                    "reward": {
                        "rewardType": MissionRewardType.VICTORY
                    },
                    "hasGivenReward": false,
                    "conditions": [
                        {
                            "id": "defeat_all_enemies",
                            "type": MissionConditionType.DEFEAT_ALL_ENEMIES
                        }
                    ],
                    "numberOfRequiredConditionsToComplete": "all"
                },
                {
                    "id": "defeat",
                    "reward": {
                        "rewardType": MissionRewardType.DEFEAT
                    },
                    "hasGivenReward": false,
                    "conditions": [
                        {
                            "id": "defeat_all_players",
                            "type": MissionConditionType.DEFEAT_ALL_PLAYERS
                        }
                    ],
                    "numberOfRequiredConditionsToComplete": "all"
                }
            ],
        }
        missionLoadSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(missionData);
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
        beforeEach(async () => {
            await loader.update(state);
            await loader.update(state);
        });

        it('should load resources into the handler', () => {
            expect(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS).toHaveLength(2);
            expect(state.resourceHandler.areAllResourcesLoaded([
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

        it('mission map', () => {
            expect(state.battleState.missionMap.terrainTileMap).toEqual(loader.missionLoaderStatus.missionMap.terrainTileMap);
        });

        it('mission objectives', () => {
            expect(state.battleState.objectives).toEqual(loader.missionLoaderStatus.objectives);
            expect(state.battleState.missionCompletionStatus).toEqual({
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
            expect(state.squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
            expect(Object.keys(state.battleState.teamsByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(state.battleState.teamStrategyByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(state.squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepository.getBattleSquaddieIterator().length);
        });

        it('cutscenes', () => {
            expect(state.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(state.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });

        it('initializes the camera', () => {
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });
    });

    describe('user wants to load a file', () => {
        let openDialogSpy: jest.SpyInstance;
        let loadedBattleSaveState: BattleSaveState;
        let hasCompletedSpy: jest.SpyInstance;
        let originalState: BattleOrchestratorState;
        let currentState: BattleOrchestratorState;

        beforeEach(() => {
            loader = new GameEngineBattleMissionLoader();
            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                mission_statistics: {
                    ...MissionStatisticsHandler.new(),
                    timeElapsedInMilliseconds: 1,
                },
                teams_by_affiliation: {
                    [SquaddieAffiliation.PLAYER]: {
                        name: "Players",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [],
                    }
                },
                cutscene_trigger_completion: [
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

            originalState = new BattleOrchestratorState({
                squaddieRepository,
                resourceHandler,
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateHelper.newBattleState({
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
            });
            originalState.battleState.gameSaveFlags.loadRequested = true;
            currentState = originalState.clone();
        });

        it('will backup the battle orchestrator state', async () => {
            await loader.update(currentState);
            expect(loader.backupBattleOrchestratorState).toEqual(originalState);
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
            expect(currentState.battleState.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(currentState.battleState.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
            expect(currentState.battleState.missionStatistics.timeElapsedInMilliseconds).toBe(1);

            expect(currentState.missingComponents).toHaveLength(0);
            expect(currentState.isValid).toBeTruthy();
        });

        it('will mark the save as complete', async () => {
            await loader.update(currentState);
            await loader.update(currentState);

            expect(currentState.battleState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(currentState.battleState.gameSaveFlags.loadingInProgress).toBeFalsy();
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
            jest.spyOn(currentState, "isValid", "get").mockReturnValue(false);
            await loader.update(currentState);
            expect(currentState).toEqual(loader.backupBattleOrchestratorState);
            await loader.update(currentState);
            expect(currentState.battleState.gameSaveFlags.loadingInProgress).toBeFalsy();
            expect(currentState.battleState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(loader.errorFoundWhileLoading).toBeTruthy();

            expect(currentState.battleState.missionStatistics.timeElapsedInMilliseconds).toEqual(originalState.battleState.missionStatistics.timeElapsedInMilliseconds);

            expect(consoleErrorSpy).toBeCalledWith("Save file is incompatible. Reverting.");
            expect(loader.hasCompleted(currentState)).toBeTruthy();
        })
    });
});
