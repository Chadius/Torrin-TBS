import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {BattleSquaddieHelper} from "../battleSquaddie";
import {GameEngineState} from "../../gameEngine/gameEngine";

const ACTION_COMPLETED_WAIT_TIME_MS = 500;

export class BattleSquaddieUsesActionOnMap implements BattleOrchestratorComponent {
    animationCompleteStartTime?: number;

    constructor() {
        this.animationCompleteStartTime = undefined;
    }

    hasCompleted(state: GameEngineState): boolean {
        return this.animationCompleteStartTime !== undefined && (Date.now() - this.animationCompleteStartTime) >= ACTION_COMPLETED_WAIT_TIME_MS;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
            pauseTimer: true,
        });
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState): void {
        this.animationCompleteStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state.battleOrchestratorState);
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (this.animationCompleteStartTime === undefined) {
            const battleSquaddieId = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound.battleSquaddieId;
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(state.battleOrchestratorState.squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

            const mostRecentAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound);

            if (mostRecentAction.type === SquaddieActionType.END_TURN) {
                BattleSquaddieHelper.endTurn(battleSquaddie);
                TintSquaddieIfTurnIsComplete(state.battleOrchestratorState.squaddieRepository, battleSquaddie, squaddieTemplate);
            }
            this.animationCompleteStartTime = Date.now();
        }
    }
}
