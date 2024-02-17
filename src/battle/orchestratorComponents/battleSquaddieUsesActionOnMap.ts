import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {ActionsThisRoundService} from "../history/actionsThisRound";

export const ACTION_COMPLETED_WAIT_TIME_MS = 500;

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

    recommendStateChanges(gameEngineState: GameEngineState): BattleOrchestratorChanges | undefined {
        ActionsThisRoundService.nextProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
        OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
        const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
        const nextMode = OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(processedActionEffectToShow);
        OrchestratorUtilities.resetCurrentlyActingSquaddieIfTheSquaddieCannotAct(gameEngineState);
        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(gameEngineState);
        OrchestratorUtilities.drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(gameEngineState);

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState): void {
        this.animationCompleteStartTime = undefined;
        state.battleOrchestratorState.battleState.actionsThisRound = undefined;
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (this.animationCompleteStartTime === undefined) {
            const battleSquaddieId = state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleSquaddieId));

            DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
                battleSquaddie,
                squaddieTemplate,
                missionMap: state.battleOrchestratorState.battleState.missionMap,
                repository: state.repository,
                campaign: state.campaign,
            });
            DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, state.repository);

            this.animationCompleteStartTime = Date.now();
        }
    }
}
