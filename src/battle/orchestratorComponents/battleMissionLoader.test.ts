import {BattleMissionLoader} from "./battleMissionLoader";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import * as mocks from "../../utils/test/mocks";
import {MissionFileFormat} from "../../dataLoader/missionLoader";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import * as DataLoader from "../../dataLoader/dataLoader";
import SpyInstance = jest.SpyInstance;

describe('BattleMissionLoader', () => {
    let initialState: BattleOrchestratorState;
    let mockResourceHandler: ResourceHandler;
    let missionData: MissionFileFormat;
    let missionLoadSpy: SpyInstance;

    beforeEach(() => {
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

        initialState = new BattleOrchestratorState({
            resourceHandler: mockResourceHandler,
            squaddieRepository: new BattleSquaddieRepository(),
        });

        missionData = {
            "terrain": [
                "1 1 1 ",
                " 1 1 1 "
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
            ]
        }
        missionLoadSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(missionData);
    });

    it('marks it as done when finished loading resources', async () => {
        const initializeSquaddieResources = jest.spyOn(BattleMissionLoader.prototype as any, 'initializeSquaddieResources').mockImplementation(() => {
        });
        const loader = new BattleMissionLoader();
        expect(loader.hasCompleted(initialState)).toBeFalsy();
        await loader.update(initialState);
        await loader.update(initialState);
        expect(mockResourceHandler.areAllResourcesLoaded).toBeCalledTimes(1);
        expect(loader.hasCompleted(initialState)).toBeFalsy();
        await loader.update(initialState);
        expect(initializeSquaddieResources).toBeCalled();
        expect(loader.hasCompleted(initialState)).toBeTruthy();
    });

    it('clears internal variables upon reset', async () => {
        const initializeSquaddieResources = jest.spyOn(BattleMissionLoader.prototype as any, 'initializeSquaddieResources').mockImplementation(() => {
        });
        const loader = new BattleMissionLoader();
        await loader.update(initialState);
        await loader.update(initialState);
        await loader.update(initialState);
        expect(initializeSquaddieResources).toBeCalled();
        expect(loader.hasCompleted(initialState)).toBeTruthy();
        expect(loader.finishedPreparations).toBeTruthy();
        expect(loader.startedLoading).toBeTruthy();

        loader.reset(new BattleOrchestratorState({}));
        expect(loader.startedLoading).toBeFalsy();
        expect(loader.finishedPreparations).toBeFalsy();
    });

    describe('loading mission data from a file', () => {
        let loader: BattleMissionLoader;

        beforeEach(() => {
            loader = new BattleMissionLoader();
        });

        it('tries to load the terrain', async () => {
            await loader.update(initialState);
            expect(missionLoadSpy).toBeCalled();
            expect(initialState.missionMap.terrainTileMap.getDimensions()).toEqual({
                widthOfWidestRow: 3,
                numberOfRows: 2
            })
        });

        it('tries to load the mission objectives', async () => {
            await loader.update(initialState);
            expect(missionLoadSpy).toBeCalled();
            expect(initialState.objectives).toHaveLength(2);
            expect(initialState.objectives[0].reward).toEqual({rewardType: MissionRewardType.VICTORY});
            expect(initialState.objectives[1].reward).toEqual({rewardType: MissionRewardType.DEFEAT});
        });
    });
});
