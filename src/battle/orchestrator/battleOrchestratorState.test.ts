import {BattleOrchestratorState, BattleOrchestratorStateValidityMissingComponent} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {StubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {MissionConditionType} from "../missionResult/missionCondition";
import {MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";

describe('orchestratorState', () => {
    it('overrides team strategy for non-player teams', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
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
        const validityCheck = (args: any, isValid: boolean, isReadyToContinueMission: boolean, reasons: BattleOrchestratorStateValidityMissingComponent[]) => {
            const state: BattleOrchestratorState = new BattleOrchestratorState(args);
            expect(state.isValid).toBe(isValid);
            expect(state.isReadyToContinueMission).toBe(isReadyToContinueMission);
            expect(state.missingComponents).toEqual(reasons);
        }

        let args = {};
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.MISSION_MAP,
            BattleOrchestratorStateValidityMissingComponent.RESOURCE_HANDLER,
            BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            missionMap: NullMissionMap(),
        }
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.RESOURCE_HANDLER,
            BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
        }
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        const squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
        args = {
            ...args,
            squaddieRepository,
        }
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
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
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
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
        let originalBattleOrchestratorState: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            missionMap: NullMissionMap(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
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
        originalBattleOrchestratorState.gameSaveFlags.savingInProgress = true;

        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = originalBattleOrchestratorState.clone();

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
    });

    it('can change itself to match other objects', () => {
        let originalBattleOrchestratorState: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            missionMap: NullMissionMap(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
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
        originalBattleOrchestratorState.gameSaveFlags.savingInProgress = true;

        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = new BattleOrchestratorState({});
        cloned.copyOtherOrchestratorState(originalBattleOrchestratorState);

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
    });
});
