import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieEndTurnAction} from "../history/squaddieEndTurnAction";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

const ACTION_COMPLETED_WAIT_TIME_MS = 500;

export class BattleSquaddieUsesActionOnMap implements BattleOrchestratorComponent {
    animationCompleteStartTime?: number;

    constructor() {
        this.animationCompleteStartTime = undefined;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.animationCompleteStartTime !== undefined && (Date.now() - this.animationCompleteStartTime) >= ACTION_COMPLETED_WAIT_TIME_MS;
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
            const battleSquaddieId = state.squaddieCurrentlyActing.squaddieActionsForThisRound.getBattleSquaddieId();
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

            const mostRecentAction = state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction();

            if (mostRecentAction instanceof SquaddieEndTurnAction) {
                battleSquaddie.endTurn();
                TintSquaddieIfTurnIsComplete(battleSquaddie, squaddieTemplate);
            }
            this.animationCompleteStartTime = Date.now();
        }
    }
}