import {
    BattleSquaddieUIInput,
    BattleSquaddieUIInputOptions,
    BattleSquaddieUISelectionState
} from "./battleSquaddieUIInput";
import {Pathfinder} from "../hexMap/pathfinder/pathfinder";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {SearchResults} from "../hexMap/pathfinder/searchResults";
import {SearchParams} from "../hexMap/pathfinder/searchParams";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {TargetingShape} from "./targeting/targetingShapeGenerator";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActions} from "../squaddie/squaddieService";

export const calculateNewBattleSquaddieUISelectionState: (stateOptions: BattleSquaddieUIInputOptions) => BattleSquaddieUISelectionState =
    (stateOptions: BattleSquaddieUIInputOptions) => {
        const state: BattleSquaddieUIInput = new BattleSquaddieUIInput(stateOptions);
        switch (state.selectionState) {
            case BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED:
                const newSelectionState = ProcessNoSquaddieSelected(state);
                if (newSelectionState !== undefined) {
                    return newSelectionState;
                }
                break;
            case BattleSquaddieUISelectionState.SELECTED_SQUADDIE:
                if (!state.tileClickedOn) {
                    return BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
                }

                if (
                    state.missionMap.getSquaddieAtLocation(state.tileClickedOn).isValid()
                ) {
                    return BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
                }

                const {
                    dynamicSquaddie,
                    staticSquaddie
                } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.selectedSquaddieDynamicID));
                const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
                    staticSquaddie,
                    dynamicSquaddie
                })
                if (!playerCanControlThisSquaddieRightNow) {
                    return BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED;
                }

                const pathfinder: Pathfinder = new Pathfinder();
                const squaddieDatum = state.missionMap.getSquaddieByDynamicId(state.selectedSquaddieDynamicID);
                const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
                const searchResults: SearchResults = getResultOrThrowError(
                    pathfinder.findPathToStopLocation(new SearchParams({
                        missionMap: state.missionMap,
                        squaddieMovement: staticSquaddie.movement,
                        startLocation: squaddieDatum.mapLocation,
                        stopLocation: state.tileClickedOn,
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                        squaddieRepository: state.squaddieRepository,
                        numberOfActions: normalActionsRemaining,
                        shapeGeneratorType: TargetingShape.Snake,
                    }))
                );
                const closestRoute = getResultOrThrowError(searchResults.getRouteToStopLocation());
                if (closestRoute != null) {
                    return BattleSquaddieUISelectionState.MOVING_SQUADDIE;
                }
                return BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
                break;
            case BattleSquaddieUISelectionState.MOVING_SQUADDIE:
                if (state.finishedAnimating) {
                    return BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED;
                }
                return BattleSquaddieUISelectionState.MOVING_SQUADDIE;
                break;
            default:
                return BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED;
        }
        return BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED;
    }

const ProcessNoSquaddieSelected = (state: BattleSquaddieUIInput): BattleSquaddieUISelectionState => {
    if (
        state.tileClickedOn &&
        state.missionMap.getSquaddieAtLocation(state.tileClickedOn).isValid()
    ) {
        return BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
    }

    if (
        state.squaddieInstructionInProgress
        && !state.squaddieInstructionInProgress.isReadyForNewSquaddie()
    ) {
        return BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
    }

    return undefined;
}
