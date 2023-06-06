import {
    OrchestratorChanges,
    OrchestratorComponent,
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

export class BattleSquaddieMover implements OrchestratorComponent {
    animationStartTime?: number;

    constructor() {
        this.animationStartTime = undefined;
    }

    hasCompleted(state: OrchestratorState): boolean {
        return this.animationStartTime && hasMovementAnimationFinished(this.animationStartTime, state.squaddieMovePath);
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState, p: p5): void {
        if (!this.animationStartTime) {
            this.animationStartTime = Date.now();
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
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(
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
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(
            state.squaddieCurrentlyActing.dynamicSquaddieId
        ));

        updateSquaddieLocation(dynamicSquaddie, staticSquaddie, state.squaddieMovePath.getDestination(), state.missionMap, dynamicSquaddie.dynamicSquaddieId);
        spendSquaddieActions(dynamicSquaddie, state.squaddieMovePath.getNumberOfMovementActions());
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
        state.squaddieCurrentlyActing = undefined;
        this.animationStartTime = undefined;
    }
}
