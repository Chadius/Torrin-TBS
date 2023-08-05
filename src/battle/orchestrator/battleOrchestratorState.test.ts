import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {BattleOrchestratorState} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";

class TestTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction | undefined {
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
