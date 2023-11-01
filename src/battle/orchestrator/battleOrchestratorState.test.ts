import {BattleOrchestratorState, BattleOrchestratorStateValidityMissingComponent} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {StubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionDefeatAffiliation} from "../missionResult/missionConditionDefeatAffiliation";

class TestTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieActionsForThisRound | undefined {
        return undefined;
    }
}
import {TeamStrategy, TeamStrategyType} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";

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
            BattleOrchestratorStateValidityMissingComponent.PATHFINDER,
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
            BattleOrchestratorStateValidityMissingComponent.PATHFINDER,
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
            BattleOrchestratorStateValidityMissingComponent.PATHFINDER,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        const squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
        args = {
            ...args,
            squaddieRepository,
        }
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION,
            BattleOrchestratorStateValidityMissingComponent.PATHFINDER,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            teamsByAffiliation: {
                [SquaddieAffiliation.PLAYER]: new BattleSquaddieTeam({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                    name: "Players",
                    squaddieRepo: squaddieRepository
                }),
                [SquaddieAffiliation.ENEMY]: new BattleSquaddieTeam({
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    name: "Baddies",
                    squaddieRepo: squaddieRepository
                }),
            }
        }
        validityCheck(args, false, false, [
            BattleOrchestratorStateValidityMissingComponent.PATHFINDER,
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            pathfinder: new Pathfinder(),
        }
        validityCheck(args, true, false, [
            BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE,
        ]);

        args = {
            ...args,
            objectives: [
                new MissionObjective({
                    reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                    conditions: [
                        new MissionConditionDefeatAffiliation({affiliation: SquaddieAffiliation.ENEMY}),
                    ],
                    numberOfCompletedConditions: 1,
                })
            ],
        }
        validityCheck(args, true, true, []);
    });
});
