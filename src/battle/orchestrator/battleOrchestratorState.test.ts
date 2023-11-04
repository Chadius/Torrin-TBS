import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {BattleOrchestratorState} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

class TestTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState, repository: BattleSquaddieRepository): SquaddieActionsForThisRound | undefined {
        return undefined;
    }
}

describe('orchestratorState', () => {
    it('overrides team strategy for non-player teams', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            teamStrategyByAffiliation: {
                ENEMY: [new TestTeamStrategy()]
            }
        });

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.PLAYER]).toBeUndefined();

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY]).toHaveLength(1);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY][0]).toBeInstanceOf(TestTeamStrategy);

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ALLY]).toHaveLength(1);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ALLY][0]).toBeInstanceOf(EndTurnTeamStrategy);

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.NONE]).toHaveLength(1);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.NONE][0]).toBeInstanceOf(EndTurnTeamStrategy);
    });
});
