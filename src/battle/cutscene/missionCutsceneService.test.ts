import {Cutscene} from "../../cutscene/cutscene";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection
} from "../orchestrator/missionCutsceneCollection";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionDefeatCutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {BattleCompletionStatus} from "../orchestrator/battleGameBoard";
import {MissionVictoryCutsceneTrigger} from "./missionVictoryCutsceneTrigger";
import {GetCutsceneTriggersToActivate} from "./missionCutsceneService";
import {MissionStartOfPhaseCutsceneTrigger} from "./missionStartOfPhaseCutsceneTrigger";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {MissionConditionType} from "../missionResult/missionCondition";
import {MissionMap} from "../../missionMap/missionMap";

describe('Mission Cutscene Service', () => {
    let mockCutscene: Cutscene;
    let cutsceneCollection: MissionCutsceneCollection;

    let victoryState: BattleOrchestratorState;
    let defeatState: BattleOrchestratorState;
    let victoryAndDefeatState: BattleOrchestratorState;
    let victoryCutsceneTrigger: MissionVictoryCutsceneTrigger;
    let defeatCutsceneTrigger: MissionDefeatCutsceneTrigger;

    let turn0State: BattleOrchestratorState;
    let turn0StateCutsceneId = "starting";
    let turn0CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger;

    beforeEach(() => {
        mockCutscene = new Cutscene({});
        cutsceneCollection = new MissionCutsceneCollection({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                [turn0StateCutsceneId]: mockCutscene,
            }
        });

        victoryCutsceneTrigger = {
            cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
            triggeringEvent: TriggeringEvent.MISSION_VICTORY,
            systemReactedToTrigger: false,
        };
        victoryState = new BattleOrchestratorState({
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
            }),
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "test",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    numberOfRequiredConditionsToComplete: 1,
                    hasGivenReward: false,
                    conditions: [
                        {
                            id: "test",
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                        }
                    ],
                })
            ],
            cutsceneCollection,
            cutsceneTriggers: [
                victoryCutsceneTrigger,
            ],
        });
        victoryState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

        defeatCutsceneTrigger = {
            cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
            triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
            systemReactedToTrigger: false,
        };
        defeatState = new BattleOrchestratorState({
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
            }),
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "test",
                    reward: {rewardType: MissionRewardType.DEFEAT},
                    numberOfRequiredConditionsToComplete: 1,
                    hasGivenReward: false,
                    conditions: [{
                        id: "test",
                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                    }],
                })
            ],
            cutsceneCollection,
            cutsceneTriggers: [
                defeatCutsceneTrigger,
            ],
        });
        defeatState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

        victoryAndDefeatState = new BattleOrchestratorState({
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
            }),
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "test",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    numberOfRequiredConditionsToComplete: 1,
                    hasGivenReward: false,
                    conditions: [{
                        id: "test",
                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    }],
                }),
                MissionObjectiveHelper.validateMissionObjective({
                    id: "test1",
                    reward: {rewardType: MissionRewardType.DEFEAT},
                    numberOfRequiredConditionsToComplete: 1,
                    hasGivenReward: false,
                    conditions: [{
                        id: "test",
                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                    }],
                })
            ],
            cutsceneCollection,
            cutsceneTriggers: [
                victoryCutsceneTrigger, defeatCutsceneTrigger,
            ],
        });
        victoryAndDefeatState.gameBoard.completionStatus = BattleCompletionStatus.IN_PROGRESS;

        turn0CutsceneTrigger = {
            cutsceneId: "starting",
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            turn: 0,
        }

        turn0State = new BattleOrchestratorState({
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                }),
            }),
            cutsceneCollection,
            objectives: [],
            cutsceneTriggers: [
                turn0CutsceneTrigger
            ],
        });
        turn0State.battlePhaseState.turnCount = 0;
    });

    describe('will check for victory conditions once the squaddie finishes action', () => {
        const modes = [
            {mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE},
            {mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP},
            {mode: BattleOrchestratorMode.SQUADDIE_MOVER},
        ]

        it.each(modes)(`mode $mode will look for victory conditions`, ({mode}) => {
            const missionObjectiveCompleteCheck = jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(true);
            expect(victoryState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

            const info = GetCutsceneTriggersToActivate(victoryState, mode);

            expect(missionObjectiveCompleteCheck).toBeCalled();

            expect(info).toStrictEqual([victoryCutsceneTrigger]);
        });
    });

    it('will not check for victory cutscenes if the mode is not related to ending squaddie actions', () => {
        expect(victoryState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);
        const info = GetCutsceneTriggersToActivate(victoryState, BattleOrchestratorMode.CUTSCENE_PLAYER);

        expect(info).toHaveLength(0);
    });

    it('will not recommend already triggered cutscenes', () => {
        expect(victoryState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);
        victoryCutsceneTrigger.systemReactedToTrigger = true;
        const info = GetCutsceneTriggersToActivate(victoryState, BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);

        expect(info).toHaveLength(0);
    });

    it('will check for defeat conditions once the squaddie finishes moving', () => {
        const missionObjectiveCompleteCheck = jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(true);
        expect(defeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

        const info = GetCutsceneTriggersToActivate(defeatState, BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);

        expect(missionObjectiveCompleteCheck).toBeCalled();

        expect(info).toStrictEqual([defeatCutsceneTrigger]);
    });

    it('if you trigger victory and defeat, defeat takes precedence', () => {
        const missionObjectiveCompleteCheck = jest.spyOn(MissionObjectiveHelper, "shouldBeComplete").mockReturnValue(true);
        expect(victoryAndDefeatState.gameBoard.completionStatus).toBe(BattleCompletionStatus.IN_PROGRESS);

        const info = GetCutsceneTriggersToActivate(defeatState, BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);

        expect(missionObjectiveCompleteCheck).toBeCalled();

        expect(info).toStrictEqual([defeatCutsceneTrigger]);
    });

    it('will check for any introductory cutscenes during turn 0', () => {
        const info = GetCutsceneTriggersToActivate(turn0State, BattleOrchestratorMode.LOADING_MISSION);

        expect(info).toStrictEqual([turn0CutsceneTrigger]);
    });

    it('will not check for any turn starting cutscenes mid turn', () => {
        const info = GetCutsceneTriggersToActivate(turn0State, BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

        expect(info).toHaveLength(0);
    });
});
