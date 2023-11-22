import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    hasMovementAnimationFinished,
    moveSquaddieAlongPath,
    TintSquaddieIfTurnIsComplete,
    updateSquaddieIconLocation
} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {spendSquaddieActionPoints, updateSquaddieLocation} from "../squaddieMovementLogic";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieSquaddieActionData} from "../history/squaddieSquaddieAction";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";

export class BattleSquaddieMover implements BattleOrchestratorComponent {
    animationStartTime?: number;

    constructor() {
        this.animationStartTime = undefined;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        if (state.squaddieMovePath === undefined) {
            return true;
        }
        return this.animationStartTime && hasMovementAnimationFinished(this.animationStartTime, state.squaddieMovePath);
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now();

            if (
                state.squaddieCurrentlyActing
                && state.squaddieCurrentlyActing.squaddieActionsForThisRound
                && SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound).type
                === SquaddieActionType.MOVEMENT
            ) {
                SquaddieInstructionInProgressHandler.markBattleSquaddieIdAsMoving(
                    state.squaddieCurrentlyActing,
                    SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
                );
            }
        }

        if (!hasMovementAnimationFinished(this.animationStartTime, state.squaddieMovePath)) {
            this.updateWhileAnimationIsInProgress(state, graphicsContext);
        } else {
            this.updateWhenAnimationCompletes(state, graphicsContext);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: BattleOrchestratorState) {
        state.squaddieMovePath = undefined;
        this.animationStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);

        if (
            state.squaddieCurrentlyActing
            && state.squaddieCurrentlyActing.squaddieActionsForThisRound
            && SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound).type
            === SquaddieActionType.MOVEMENT
        ) {
            SquaddieInstructionInProgressHandler.removeBattleSquaddieIdAsMoving(
                state.squaddieCurrentlyActing,
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
            );
        }

        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
    }

    private updateWhileAnimationIsInProgress(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
        ));

        moveSquaddieAlongPath(state.squaddieRepository, battleSquaddie, this.animationStartTime, state.squaddieMovePath, state.camera);
        const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            mapIcon.draw(graphicsContext);
        }
    }

    private updateWhenAnimationCompletes(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
        ));

        updateSquaddieLocation(battleSquaddie, squaddieTemplate, state.squaddieMovePath.destination, state.missionMap, battleSquaddie.battleSquaddieId);
        const mostRecentAction = SquaddieActionsForThisRoundHandler.getMostRecentAction(state.squaddieCurrentlyActing.squaddieActionsForThisRound);
        if (mostRecentAction.type === SquaddieActionType.MOVEMENT) {
            spendSquaddieActionPoints(battleSquaddie, (mostRecentAction.data as SquaddieSquaddieActionData).numberOfActionPointsSpent);
        }

        const mapIcon = state.squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
        if (mapIcon) {
            updateSquaddieIconLocation(state.squaddieRepository, battleSquaddie, state.squaddieMovePath.destination, state.camera);
            TintSquaddieIfTurnIsComplete(state.squaddieRepository, battleSquaddie, squaddieTemplate);
            mapIcon.draw(graphicsContext);
        }
        state.missionMap.terrainTileMap.stopHighlightingTiles();
    }
}
