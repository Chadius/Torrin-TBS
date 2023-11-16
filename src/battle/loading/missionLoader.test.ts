import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import * as mocks from "../../utils/test/mocks";
import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionFileFormat} from "../../dataLoader/missionLoader";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import * as DataLoader from "../../dataLoader/dataLoader";
import {
    MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
    MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
    MissionLoader,
    MissionLoaderStatus
} from "./missionLoader";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {makeResult} from "../../utils/ResultOrError";
import {DEFAULT_VICTORY_CUTSCENE_ID} from "../orchestrator/missionCutsceneCollection";

describe('Mission Loader', () => {
    let resourceHandler: ResourceHandler;
    let missionData: MissionFileFormat;
    let missionLoadSpy: jest.SpyInstance;
    let missionLoaderStatus: MissionLoaderStatus;
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.loadResources = jest.fn();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValue(true);

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
        missionLoaderStatus = MissionLoader.newEmptyMissionLoaderStatus();
        squaddieRepository = new BattleSquaddieRepository();
    });

    it('knows it has not started yet', () => {
        expect(missionLoaderStatus.completionProgress.started).toBeFalsy();
        expect(missionLoaderStatus.completionProgress.loadedFileData).toBeFalsy();
    });

    describe('can load mission data from a file', () => {
        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
            });
        });

        it('calls the loading function', () => {
            expect(missionLoadSpy).toBeCalled();
        });

        it('reports file loading was a success', () => {
            expect(missionLoaderStatus.completionProgress.loadedFileData).toBeTruthy();
        });

        it('loaded the mission map', () => {
            expect(missionLoaderStatus.missionMap.terrainTileMap).toEqual(
                new TerrainTileMap({
                    movementCost: [
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
                    resourceHandler,
                })
            )
        });

        it('tries to load movement resources for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
            expect(missionLoaderStatus.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS)
            );
        });

        it('tries to load attribute icons for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
            expect(missionLoaderStatus.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS)
            );
        });

        it('can extract objectives', () => {
            expect(missionLoaderStatus.objectives).toEqual(missionData.objectives);
        });

        it('initializes the camera', () => {
            expect(missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });
    });

    describe('can load mission data from hardcoded assets', () => {

        let initialPendingResourceListLength: number;

        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
            });

            initialPendingResourceListLength = missionLoaderStatus.resourcesPendingLoading.length;

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderStatus,
                squaddieRepository,
                resourceHandler,
            });
        });

        it('gets squaddies', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
            expect(Object.keys(missionLoaderStatus.squaddieData.teamsByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(missionLoaderStatus.squaddieData.teamStrategyByAffiliation).length).toBeGreaterThan(0);
            expect(missionLoaderStatus.resourcesPendingLoading.length).toBeGreaterThan(initialPendingResourceListLength);
        });

        it('gets cutscenes', () => {
            expect("cutsceneCollection" in missionLoaderStatus.cutsceneInfo).toBeTruthy();
            expect("cutsceneTriggers" in missionLoaderStatus.cutsceneInfo).toBeTruthy();
        });
    });

    it('can reduce the pending resources', () => {
        missionLoaderStatus.resourcesPendingLoading = ["A", "B", "C"];
        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return false;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual(["A", "B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return resourceKey === "A";
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual(["B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return true;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual([]);
    });

    describe('initializes resources once loading is finished and resources are found', () => {
        beforeEach(async () => {
            resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
            });

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderStatus,
                squaddieRepository,
                resourceHandler,
            });

            jest.spyOn(resourceHandler, "isResourceLoaded").mockReturnValue(true);
            resourceHandler.loadResources(missionLoaderStatus.resourcesPendingLoading);

            MissionLoader.assignResourceHandlerResources({
                missionLoaderStatus,
                resourceHandler,
                squaddieRepository,
            });
        });

        it('initializes squaddie resources', () => {
            expect(Object.keys(squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepository.getBattleSquaddieIterator().length);
        });

        it('initializes cutscenes', () => {
            expect(missionLoaderStatus.cutsceneInfo.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });
    });
});
