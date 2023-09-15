import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";

export enum MidTurnSelectingSquaddieState {
    UNKNOWN = "UNKNOWN",
    NO_SQUADDIE_SELECTED = "NO_SQUADDIE_SELECTED",
    SELECTED_SQUADDIE = "SELECTED_SQUADDIE",
}

export type MidTurnInputState = {
    selectionState: MidTurnSelectingSquaddieState;
    missionMap: MissionMap;
    squaddieRepository: BattleSquaddieRepository;
    selectedSquaddieDynamicID?: string;
    tileClickedOn?: HexCoordinate;
    finishedAnimating?: boolean;
    squaddieInstructionInProgress: SquaddieInstructionInProgress;
}

export class MidTurnInput {
    selectedSquaddieDynamicID?: string;
    missionMap: MissionMap;
    tileClickedOn?: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    finishedAnimating?: boolean;

    constructor(options: {
        selectionState: MidTurnSelectingSquaddieState;
        missionMap: MissionMap;
        squaddieRepository: BattleSquaddieRepository;
        selectedSquaddieDynamicID?: string;
        tileClickedOn?: HexCoordinate;
        finishedAnimating?: boolean;
        squaddieInstructionInProgress: SquaddieInstructionInProgress;
    } | MidTurnInputState) {
        ({
            selectedSquaddieDynamicID: this.selectedSquaddieDynamicID,
            selectionState: this._selectionState,
            missionMap: this.missionMap,
            tileClickedOn: this.tileClickedOn,
            squaddieRepository: this.squaddieRepository,
            finishedAnimating: this.finishedAnimating,
            squaddieInstructionInProgress: this._squaddieInstructionInProgress,
        } = options);
    }

    private _selectionState: MidTurnSelectingSquaddieState;

    get selectionState(): MidTurnSelectingSquaddieState {
        return this._selectionState;
    }

    private _squaddieInstructionInProgress: SquaddieInstructionInProgress;

    get squaddieInstructionInProgress(): SquaddieInstructionInProgress {
        return this._squaddieInstructionInProgress;
    }

    reset() {
        this.changeSelectionState(MidTurnSelectingSquaddieState.NO_SQUADDIE_SELECTED);
    }

    changeSelectionState(newSelectionState: MidTurnSelectingSquaddieState, dynamicSquaddieId?: string) {
        this._selectionState = newSelectionState;
        if (dynamicSquaddieId !== undefined && dynamicSquaddieId !== null) {
            this.selectedSquaddieDynamicID = dynamicSquaddieId;
        }
    }
}
