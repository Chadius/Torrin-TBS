import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {TeamStrategyState} from "../teamStrategy/teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {OrchestratorState} from "./orchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";

class TestTeamStrategy implements TeamStrategy {
    DetermineNextInstruction(state: TeamStrategyState): SquaddieInstruction {
        return undefined;
    }
}

describe('orchestratorState', () => {
    it('overrides team strategy for non-player teams', () => {
        const state: OrchestratorState = new OrchestratorState({
            teamStrategyByAffiliation: {
                ENEMY: new TestTeamStrategy()
            }
        });

        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.PLAYER]).toBeUndefined();
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY]).toBeInstanceOf(TestTeamStrategy);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.ALLY]).toBeInstanceOf(EndTurnTeamStrategy);
        expect(state.teamStrategyByAffiliation[SquaddieAffiliation.NONE]).toBeInstanceOf(EndTurnTeamStrategy);
    });
});
