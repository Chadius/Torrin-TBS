import * as battleOrchestratorStateSubstitution from "./battleOrchestratorStateSubstitution"
import {SubstituteText} from "./textSubstitution";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";

describe("TextSubstitution", () => {
    it('will pass input to the BattleOrchestratorStateSubstitution when a battle orchestrator state is provided', () => {
        const battleOrchestratorStateSubstitutionSpy = jest.spyOn(battleOrchestratorStateSubstitution, "SubstituteTextUsingBattleOrchestraState");
        SubstituteText("No battle orchestrator state", {});
        expect(battleOrchestratorStateSubstitutionSpy).not.toBeCalled();

        const state = BattleOrchestratorStateService.newOrchestratorState({

            battleState: BattleStateService.newBattleState({
                campaignId: "test campaign",
                missionId: "test mission",
            }),
        });
        SubstituteText("With battle orchestrator state", {
            battleOrchestratorState: state,
        });
        expect(battleOrchestratorStateSubstitutionSpy).toBeCalled();
    });
});
