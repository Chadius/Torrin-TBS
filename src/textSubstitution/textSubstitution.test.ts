import * as battleOrchestratorStateSubstitution from "./battleOrchestratorStateSubstitution"
import {SubstituteText} from "./textSubstitution";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateHelper} from "../battle/orchestrator/battleState";

describe("TextSubstitution", () => {
    it('will pass input to the BattleOrchestratorStateSubstitution when a battle orchestrator state is provided', () => {
        const battleOrchestratorStateSubstitutionSpy = jest.spyOn(battleOrchestratorStateSubstitution, "SubstituteTextUsingBattleOrchestraState");
        SubstituteText("No battle orchestrator state", {});
        expect(battleOrchestratorStateSubstitutionSpy).not.toBeCalled();

        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({}),
        });
        SubstituteText("With battle orchestrator state", {
            battleOrchestratorState: state,
        });
        expect(battleOrchestratorStateSubstitutionSpy).toBeCalled();
    });
});
