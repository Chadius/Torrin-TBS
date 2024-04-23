import {BattleState, BattleStateService, BattleStateValidityMissingComponent} from "./BattleState";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import {MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {SquaddieIdService} from "../../squaddie/id";
import {BattleSquaddieService} from "../battleSquaddie";

describe('Battle State', () => {
    it('overrides team strategy for non-player teams', () => {
        const state: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            teams: [
                {
                    id: "enemy team strategy",
                    name: "bad guys",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                }
            ],
            teamStrategiesById: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    }
                ],
            },
        });

        expect(BattleStateService.getTeamsAndStrategiesByAffiliation({
            battleState: state,
            affiliation: SquaddieAffiliation.PLAYER
        })).toBeUndefined();
        expect(BattleStateService.getTeamsAndStrategiesByAffiliation({
            battleState: state,
            affiliation: SquaddieAffiliation.ENEMY
        })).toEqual({
            teams: [
                {
                    id: "enemy team strategy",
                    name: "bad guys",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                }
            ],
            strategies: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    }
                ],
            }
        });
        expect(BattleStateService.getTeamsAndStrategiesByAffiliation({
            battleState: state,
            affiliation: SquaddieAffiliation.ALLY
        })).toEqual({
            teams: [],
            strategies: {}
        });
        expect(BattleStateService.getTeamsAndStrategiesByAffiliation({
            battleState: state,
            affiliation: SquaddieAffiliation.NONE
        })).toEqual({
            teams: [],
            strategies: {}
        });
    });

    it('will indicate if it is ready for battle', () => {
        const validityCheck = (args: any, isValid: boolean, isReadyToContinueMission: boolean, reasons: BattleStateValidityMissingComponent[]) => {
            const state: BattleState = BattleStateService.newBattleState(args);
            expect(BattleStateService.isValid(state)).toBe(isValid);
            expect(BattleStateService.isReadyToContinueMission(state)).toBe(isReadyToContinueMission);
            expect(BattleStateService.missingComponents(state)).toEqual(
                expect.arrayContaining(reasons)
            );
        }

        let args = {};
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.MISSION_MAP,
            BattleStateValidityMissingComponent.TEAMS,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            missionMap: NullMissionMap(),
        }
        validityCheck(args, false, false, [
            BattleStateValidityMissingComponent.TEAMS,
            BattleStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            teams: [
                {
                    id: "playerTeam",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                {
                    id: "enemyTeam",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            ]
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
        let originalBattleState: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            missionMap: NullMissionMap(),
            teams: [
                {
                    id: "playerTeamId",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_player_team",
                },
                {
                    id: "enemyTeamId",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            teamStrategiesById: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    }
                ],
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

        expect(BattleStateService.isValid(originalBattleState)).toBeTruthy();

        const cloned: BattleState = BattleStateService.clone(originalBattleState);

        expect(BattleStateService.isValid(cloned)).toBeTruthy();
        expect(cloned).toEqual(originalBattleState);
    });

    it('can change itself to match other objects', () => {
        let originalBattleState: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            missionMap: NullMissionMap(),
            teams: [
                {
                    id: "playerTeamId",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_player_team",
                },
                {
                    id: "enemyTeamId",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            teamStrategiesById: {
                "enemy team strategy": [
                    {
                        type: TeamStrategyType.END_TURN,
                        options: {},
                    }
                ],
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

        expect(BattleStateService.isValid(originalBattleState)).toBeTruthy();

        const cloned: BattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
        });
        BattleStateService.update(cloned, originalBattleState);

        expect(BattleStateService.isValid(cloned)).toBeTruthy();
        expect(cloned).toEqual(originalBattleState);
    });

    describe('getCurrentTeam', () => {
        let playerTeam0: BattleSquaddieTeam;
        let playerTeam1: BattleSquaddieTeam;
        let enemyTeam0: BattleSquaddieTeam;
        let battleState: BattleState;
        let squaddieRepository: ObjectRepository;

        beforeEach(() => {
            squaddieRepository = ObjectRepositoryService.new();
            const playerTemplate: SquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "player template",
                    name: "player template",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            });
            ObjectRepositoryService.addSquaddieTemplate(squaddieRepository, playerTemplate);
            ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 0",
                    squaddieTemplate: playerTemplate,
                })
            );
            ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 0 1",
                    squaddieTemplate: playerTemplate,
                })
            );
            ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "player 1",
                    squaddieTemplate: playerTemplate,
                })
            );

            playerTeam0 = {
                id: "player team 0",
                name: "player team 0",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: ["player 0", "player 0 1"],
                iconResourceKey: "icon_player_team",
            };

            playerTeam1 = {
                id: "player team 1",
                name: "player team 1",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: ["player 1"],
                iconResourceKey: "icon_player_team",
            };

            const enemyTemplate: SquaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "enemy template",
                    name: "enemy template",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            });
            ObjectRepositoryService.addSquaddieTemplate(squaddieRepository, enemyTemplate);
            ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "enemy 0",
                    squaddieTemplate: enemyTemplate,
                })
            );

            enemyTeam0 = {
                id: "enemy team 0",
                name: "enemy team 0",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: ["enemy 0"],
                iconResourceKey: "icon_enemy_team",
            };

            battleState = BattleStateService.new({
                campaignId: "test campaign",
                missionId: "mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 0,
                },
                teams: [playerTeam0, playerTeam1, enemyTeam0],
            });
        });
        it('reports no teams when there are no teams with the current affiliation', () => {
            battleState.battlePhaseState.currentAffiliation = BattlePhase.UNKNOWN;
            expect(BattleStateService.getCurrentTeam(battleState, squaddieRepository)).toBeUndefined();
        });
        it('reports the first added team of a given affiliation when all teams are ready', () => {
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER;
            expect(BattleStateService.getCurrentTeam(battleState, squaddieRepository)).toBe(playerTeam0);
        });
        it('reports the second added team of a given affiliation if the first team cannot act', () => {
            BattleSquaddieTeamService.endTurn(playerTeam0, squaddieRepository);
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER;
            expect(BattleStateService.getCurrentTeam(battleState, squaddieRepository)).toBe(playerTeam1);
        });
        it('reports no teams when all of the teams of a given affiliation cannot act', () => {
            BattleSquaddieTeamService.endTurn(playerTeam0, squaddieRepository);
            BattleSquaddieTeamService.endTurn(playerTeam1, squaddieRepository);
            battleState.battlePhaseState.currentAffiliation = BattlePhase.PLAYER;
            expect(BattleStateService.getCurrentTeam(battleState, squaddieRepository)).toBeUndefined();
        });
    });
});
