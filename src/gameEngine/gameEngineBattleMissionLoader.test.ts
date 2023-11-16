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

        loader.update(state);
    });

    it('asks the mission loader to load the mission', () => {
        expect(missionLoadSpy).toBeCalled();
    });

    it('knows file has been loaded', () => {
        expect(loader.missionLoaderStatus.completionProgress.started).toBeTruthy();
        expect(loader.missionLoaderStatus.completionProgress.loadedFileData).toBeTruthy();
    });

    it('knows it has not gotten resources yet', () => {
        expect(loader.appliedResources).toBeFalsy();
    });

    it('knows it is not complete', () => {
        expect(loader.hasCompleted(state)).toBeFalsy();
    });

    describe('will wait for the resources to load before finishing', () => {
        beforeEach(() => {
            loader.update(state);
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
            expect(state.missionMap.terrainTileMap).toEqual(loader.missionLoaderStatus.missionMap.terrainTileMap);
        });

        it('mission objectives', () => {
            expect(state.gameBoard.objectives).toEqual(loader.missionLoaderStatus.objectives);
            expect(state.missionCompletionStatus).toEqual({
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
            expect(Object.keys(state.teamsByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(state.teamStrategyByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(state.squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepository.getBattleSquaddieIterator().length);
        });

        it('cutscenes', () => {
            expect(state.cutsceneTriggers.length).toBeGreaterThan(0);
            expect(state.gameBoard.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });

        it('initializes the camera', () => {
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(loader.missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });
    });
});
