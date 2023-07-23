import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {tintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";

const ACTIVITY_COMPLETED_WAIT_TIME_MS = 500;

export class BattleSquaddieMapActivity implements OrchestratorComponent {
    animationCompleteStartTime?: number;

    constructor() {
        this.animationCompleteStartTime = undefined;
    }

    hasCompleted(state: OrchestratorState): boolean {
        return (this.animationCompleteStartTime !== undefined && Date.now() - this.animationCompleteStartTime) >= ACTIVITY_COMPLETED_WAIT_TIME_MS;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: OrchestratorState): void {
        this.animationCompleteStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    }

    update(state: OrchestratorState, p: p5): void {
        if (this.animationCompleteStartTime === undefined) {
            const dynamicSquaddieId = state.squaddieCurrentlyActing.instruction.getDynamicSquaddieId();
            const {
                dynamicSquaddie,
                staticSquaddie
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

            const mostRecentActivity = state.squaddieCurrentlyActing.instruction.getMostRecentActivity();

            if (mostRecentActivity instanceof SquaddieEndTurnActivity) {
                dynamicSquaddie.endTurn();
                tintSquaddieIfTurnIsComplete(dynamicSquaddie, staticSquaddie);
            }
            this.animationCompleteStartTime = Date.now();
        }
    }
}
