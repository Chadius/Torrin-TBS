import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {HexCoordinate} from "../../hexMap/hexGrid";
import {calculateNewBattleSquaddieUISelectionState} from "../battleSquaddieUIService";
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
    hasCompleted(state: OrchestratorState): boolean {
        return state.battleSquaddieUIInput.getSelectionState() !== BattleSquaddieUISelectionState.MOVING_SQUADDIE;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState, p?: p5): void {
        if (state.battleSquaddieUIInput.getSelectionState() === BattleSquaddieUISelectionState.MOVING_SQUADDIE) {
            this.updateBattleSquaddieUIMovingSquaddie(state, state.clickedHexCoordinate);
            this.moveSquaddie(state, p);
        }
    }

    private updateBattleSquaddieUIMovingSquaddie(state: OrchestratorState, clickedHexCoordinate?: HexCoordinate) {
        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: state.battleSquaddieUIInput.selectionState,
                missionMap: state.missionMap,
                squaddieRepository: state.squaddieRepo,
                selectedSquaddieDynamicID: state.battleSquaddieUIInput.selectedSquaddieDynamicID,
                finishedAnimating: hasMovementAnimationFinished(state.animationTimer, state.squaddieMovePath),
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED) {
            state.battleSquaddieUIInput.changeSelectionState(newSelectionState);
            state.hexMap.stopHighlightingTiles();
        }
    }

    private moveSquaddie(state: OrchestratorState, p: p5) {
        if (!state.squaddieMovePath) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(
            state.battleSquaddieUIInput.selectedSquaddieDynamicID
        ));

        if (hasMovementAnimationFinished(state.animationTimer, state.squaddieMovePath)) {
            updateSquaddieLocation(dynamicSquaddie, staticSquaddie, state.squaddieMovePath.getDestination(), state.missionMap);
            updateSquaddieIconLocation(dynamicSquaddie, state.squaddieMovePath.getDestination(), state.camera);
            spendSquaddieActions(dynamicSquaddie, state.squaddieMovePath.getNumberOfMovementActions());
            tintSquaddieIfTurnIsComplete(dynamicSquaddie, staticSquaddie);
        } else {
            moveSquaddieAlongPath(dynamicSquaddie, state.animationTimer, state.squaddieMovePath, state.camera);
        }
        dynamicSquaddie.mapIcon.draw(p);
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset() {

    }
}