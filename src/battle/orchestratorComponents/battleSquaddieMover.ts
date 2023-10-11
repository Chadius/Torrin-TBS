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
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

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
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now();

            if (
                state.squaddieCurrentlyActing
                && state.squaddieCurrentlyActing.squaddieActionsForThisRound
                && state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction() instanceof SquaddieMovementAction
            ) {
                state.squaddieCurrentlyActing.markBattleSquaddieIdAsMoving(state.squaddieCurrentlyActing.battleSquaddieId);
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
            && state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction() instanceof SquaddieMovementAction
        ) {
            state.squaddieCurrentlyActing.removeBattleSquaddieIdAsMoving(state.squaddieCurrentlyActing.battleSquaddieId);
        }

        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
    }

    private updateWhileAnimationIsInProgress(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            state.squaddieCurrentlyActing.battleSquaddieId
        ));

        moveSquaddieAlongPath(battleSquaddie, this.animationStartTime, state.squaddieMovePath, state.camera);
        if (battleSquaddie.mapIcon) {
            battleSquaddie.mapIcon.draw(graphicsContext);
        }
    }

    private updateWhenAnimationCompletes(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            state.squaddieCurrentlyActing.battleSquaddieId
        ));

        updateSquaddieLocation(battleSquaddie, squaddieTemplate, state.squaddieMovePath.getDestination(), state.missionMap, battleSquaddie.battleSquaddieId);
        const mostRecentAction = state.squaddieCurrentlyActing.squaddieActionsForThisRound.getMostRecentAction();
        if (mostRecentAction instanceof SquaddieMovementAction) {
            spendSquaddieActionPoints(battleSquaddie, mostRecentAction.numberOfActionPointsSpent);
        }

        if (battleSquaddie.mapIcon) {
            updateSquaddieIconLocation(battleSquaddie, state.squaddieMovePath.getDestination(), state.camera);
            TintSquaddieIfTurnIsComplete(battleSquaddie, squaddieTemplate);
            battleSquaddie.mapIcon.draw(graphicsContext);
        }
        state.hexMap.stopHighlightingTiles();
    }
}
