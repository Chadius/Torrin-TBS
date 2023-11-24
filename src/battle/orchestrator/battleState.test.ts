import {BattleState, BattleStateHelper, BattleStateValidityMissingComponent} from "./BattleState";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import {MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";

describe('Battle State', () => {
    it('overrides team strategy for non-player teams', () => {
        const state: BattleState = BattleStateHelper.newBattleState({
            teamStrategyByAffiliation: {
                ENEMY: [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    }
                ]
            }
        });

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.PLAYER]).toBeUndefined();

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY]).toHaveLength(1);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY][0].type).toBe(TeamStrategyType.END_TURN);

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ALLY]).toHaveLength(0);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.NONE]).toHaveLength(0);
    });

    it('will indicate if it is ready for battle', () => {
        const validityCheck = (args: any, isValid: boolean, isReadyToContinueMission: boolean, reasons: BattleStateValidityMissingComponent[]) => {
            const state: BattleState = BattleStateHelper.newBattleState(args);
            expect(BattleStateHelper.isValid(state)).toBe(isValid);
            expect(BattleStateHelper.isReadyToContinueMission(state)).toBe(isReadyToContinueMission);
            expect(BattleStateHelper.missingComponents(state)).toEqual(reasons);
        }

        let args = {};
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.MISSION_MAP,
            BattleStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            missionMap: NullMissionMap(),
        }
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            teamsByAffiliation: {
                [SquaddieAffiliation.PLAYER]: {
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                [SquaddieAffiliation.ENEMY]: {
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            }
        }
        validityCheck(args, true, false, [
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        }
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                })
            ],
        }
        validityCheck(args, true, true, []);
    });

    it('can clone existing objects', () => {
        let originalBattleState: BattleState = BattleStateHelper.newBattleState({
            missionMap: NullMissionMap(),
            teamsByAffiliation: {
                [SquaddieAffiliation.PLAYER]: {
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                [SquaddieAffiliation.ENEMY]: {
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            },
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        }
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                })
            ],
            missionCompletionStatus: {},
            missionStatistics: MissionStatisticsHandler.new(),
            cutsceneTriggers: [],
            battlePhaseState: {
                turnCount: 20,
                currentAffiliation: BattlePhase.ENEMY,
            }
        });
        originalBattleState.gameSaveFlags.savingInProgress = true;

        expect(BattleStateHelper.isValid(originalBattleState)).toBeTruthy();

        const cloned: BattleState = BattleStateHelper.clone(originalBattleState);

        expect(BattleStateHelper.isValid(cloned)).toBeTruthy();
        expect(cloned).toEqual(originalBattleState);
    });

    it('can change itself to match other objects', () => {
        let originalBattleState: BattleState = BattleStateHelper.newBattleState({
            missionMap: NullMissionMap(),
            teamsByAffiliation: {
                [SquaddieAffiliation.PLAYER]: {
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                [SquaddieAffiliation.ENEMY]: {
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            },
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        }
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                })
            ],
            missionCompletionStatus: {},
            missionStatistics: MissionStatisticsHandler.new(),
            cutsceneTriggers: [],
            battlePhaseState: {
                turnCount: 20,
                currentAffiliation: BattlePhase.ENEMY,
            }
        });
        originalBattleState.gameSaveFlags.savingInProgress = true;

        expect(BattleStateHelper.isValid(originalBattleState)).toBeTruthy();

        const cloned: BattleState = BattleStateHelper.newBattleState({});
        BattleStateHelper.update(cloned, originalBattleState);

        expect(BattleStateHelper.isValid(cloned)).toBeTruthy();
        expect(cloned).toEqual(originalBattleState);
    });
});
