import {BattleOrchestratorState} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategyType} from "../teamStrategy/teamStrategy";

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
});
