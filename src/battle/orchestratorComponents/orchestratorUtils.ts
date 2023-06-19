import {getResultOrThrowError} from "../../utils/ResultOrError";
import {OrchestratorState} from "../orchestrator/orchestratorState";

export const ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: OrchestratorState) => {
    if (state.squaddieCurrentlyActing && !state.squaddieCurrentlyActing.isReadyForNewSquaddie()) {
        const {dynamicSquaddie} = getResultOrThrowError(
            state.squaddieRepo.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );
        if (!dynamicSquaddie.squaddieTurn.hasActionsRemaining()) {
            state.squaddieCurrentlyActing.reset();
        }
    }
}
