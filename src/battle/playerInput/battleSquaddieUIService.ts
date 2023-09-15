import {MidTurnInput, MidTurnInputState, MidTurnSelectingSquaddieState} from "./midTurnInput";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {CanPlayerControlSquaddieRightNow} from "../../squaddie/squaddieService";

export const calculateNewBattleSquaddieUISelectionState: (stateOptions: MidTurnInputState) => MidTurnSelectingSquaddieState =
    (stateOptions: MidTurnInputState) => {
        const state: MidTurnInput = new MidTurnInput(stateOptions);
        switch (state.selectionState) {
            case MidTurnSelectingSquaddieState.NO_SQUADDIE_SELECTED:
                const newSelectionState = ProcessNoSquaddieSelected(state);
                if (newSelectionState !== undefined) {
                    return newSelectionState;
                }
                break;
            case MidTurnSelectingSquaddieState.SELECTED_SQUADDIE:
                if (!state.tileClickedOn) {
                    return MidTurnSelectingSquaddieState.SELECTED_SQUADDIE;
                }

                if (
                    state.missionMap.getSquaddieAtLocation(state.tileClickedOn).isValid()
                ) {
                    return MidTurnSelectingSquaddieState.SELECTED_SQUADDIE;
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
                    return MidTurnSelectingSquaddieState.NO_SQUADDIE_SELECTED;
                }

                return MidTurnSelectingSquaddieState.SELECTED_SQUADDIE;
            default:
                return MidTurnSelectingSquaddieState.NO_SQUADDIE_SELECTED;
        }
        return MidTurnSelectingSquaddieState.NO_SQUADDIE_SELECTED;
    }

const ProcessNoSquaddieSelected = (state: MidTurnInput): MidTurnSelectingSquaddieState => {
    if (
        state.tileClickedOn &&
        state.missionMap.getSquaddieAtLocation(state.tileClickedOn).isValid()
    ) {
        return MidTurnSelectingSquaddieState.SELECTED_SQUADDIE;
    }

    if (
        state.squaddieInstructionInProgress
        && !state.squaddieInstructionInProgress.isReadyForNewSquaddie
    ) {
        return MidTurnSelectingSquaddieState.SELECTED_SQUADDIE;
    }

    return undefined;
}
