import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

const ACTIVITY_COMPLETED_WAIT_TIME_MS = 500;

export class BattleSquaddieMapActivity implements BattleOrchestratorComponent {
    animationCompleteStartTime?: number;

    constructor() {
        this.animationCompleteStartTime = undefined;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.animationCompleteStartTime !== undefined && (Date.now() - this.animationCompleteStartTime) >= ACTIVITY_COMPLETED_WAIT_TIME_MS;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
        });
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: BattleOrchestratorState): void {
        this.animationCompleteStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (this.animationCompleteStartTime === undefined) {
            const dynamicSquaddieId = state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getDynamicSquaddieId();
            const {
                dynamicSquaddie,
                staticSquaddie
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

            const mostRecentActivity = state.squaddieCurrentlyActing.squaddieActivitiesForThisRound.getMostRecentActivity();

            if (mostRecentActivity instanceof SquaddieEndTurnActivity) {
                dynamicSquaddie.endTurn();
                TintSquaddieIfTurnIsComplete(dynamicSquaddie, staticSquaddie);
            }
            this.animationCompleteStartTime = Date.now();
        }
    }
}
