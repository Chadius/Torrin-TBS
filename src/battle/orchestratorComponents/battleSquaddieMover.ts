import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {
    hasMovementAnimationFinished,
    moveSquaddieAlongPath,
    tintSquaddieIfTurnIsComplete,
    updateSquaddieIconLocation
} from "../animation/drawSquaddie";
import p5 from "p5";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {spendSquaddieActions, updateSquaddieLocation} from "../squaddieMovementLogic";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {UIControlSettings} from "../orchestrator/uiControlSettings";

export class BattleSquaddieMover implements OrchestratorComponent {
    animationStartTime?: number;

    constructor() {
        this.animationStartTime = undefined;
    }

    hasCompleted(state: OrchestratorState): boolean {
        if (state.squaddieMovePath === undefined) {
            return true;
        }
        return this.animationStartTime && hasMovementAnimationFinished(this.animationStartTime, state.squaddieMovePath);
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: OrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }

    update(state: OrchestratorState, p: p5): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now();

            if (
                state.squaddieCurrentlyActing
                && state.squaddieCurrentlyActing.instruction
                && state.squaddieCurrentlyActing.instruction.getMostRecentActivity() instanceof SquaddieMovementActivity
            ) {
                state.squaddieCurrentlyActing.markSquaddieDynamicIdAsMoving(state.squaddieCurrentlyActing.dynamicSquaddieId);
            }
        }

        if (!hasMovementAnimationFinished(this.animationStartTime, state.squaddieMovePath)) {
            this.updateWhileAnimationIsInProgress(state, p);
        } else {
            this.updateWhenAnimationCompletes(state, p);
        }
    }

    private updateWhileAnimationIsInProgress(state: OrchestratorState, p: p5) {
        const {
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(
            state.squaddieCurrentlyActing.dynamicSquaddieId
        ));

        moveSquaddieAlongPath(dynamicSquaddie, this.animationStartTime, state.squaddieMovePath, state.camera);
        if (dynamicSquaddie.mapIcon) {
            dynamicSquaddie.mapIcon.draw(p);
        }
    }

    private updateWhenAnimationCompletes(state: OrchestratorState, p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(
            state.squaddieCurrentlyActing.dynamicSquaddieId
        ));

        updateSquaddieLocation(dynamicSquaddie, staticSquaddie, state.squaddieMovePath.getDestination(), state.missionMap, dynamicSquaddie.dynamicSquaddieId);
        const mostRecentActivity = state.squaddieCurrentlyActing.instruction.getMostRecentActivity();
        if (mostRecentActivity instanceof SquaddieMovementActivity) {
            spendSquaddieActions(dynamicSquaddie, mostRecentActivity.numberOfActionsSpent);
        }

        if (dynamicSquaddie.mapIcon) {
            updateSquaddieIconLocation(dynamicSquaddie, state.squaddieMovePath.getDestination(), state.camera);
            tintSquaddieIfTurnIsComplete(dynamicSquaddie, staticSquaddie);
            dynamicSquaddie.mapIcon.draw(p);
        }
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
        state.hexMap.stopHighlightingTiles();
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: OrchestratorState) {
        state.squaddieMovePath = undefined;
        this.animationStartTime = undefined;
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);

        if (
            state.squaddieCurrentlyActing
            && state.squaddieCurrentlyActing.instruction
            && state.squaddieCurrentlyActing.instruction.getMostRecentActivity() instanceof SquaddieMovementActivity
        ) {
            state.squaddieCurrentlyActing.removeSquaddieDynamicIdAsMoving(state.squaddieCurrentlyActing.dynamicSquaddieId);
        }

        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
    }
}
