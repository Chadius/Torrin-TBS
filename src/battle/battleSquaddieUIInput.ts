import {MissionMap} from "../missionMap/missionMap";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "./history/squaddieInstructionInProgress";

export enum BattleSquaddieUISelectionState {
    UNKNOWN = "UNKNOWN",
    NO_SQUADDIE_SELECTED = "NO_SQUADDIE_SELECTED",
    SELECTED_SQUADDIE = "SELECTED_SQUADDIE",
    MOVING_SQUADDIE = "MOVING_SQUADDIE",
}

export type BattleSquaddieUIInputOptions = {
    selectionState: BattleSquaddieUISelectionState;
    missionMap: MissionMap;
    squaddieRepository: BattleSquaddieRepository;
    selectedSquaddieDynamicID?: string;
    tileClickedOn?: HexCoordinate;
    finishedAnimating?: boolean;
    squaddieInstructionInProgress: SquaddieInstructionInProgress;
}

export class BattleSquaddieUIInput {
    selectedSquaddieDynamicID?: string;
    missionMap: MissionMap;
    tileClickedOn?: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    finishedAnimating?: boolean;

    constructor(options: {
        selectionState: BattleSquaddieUISelectionState;
        missionMap: MissionMap;
        squaddieRepository: BattleSquaddieRepository;
        selectedSquaddieDynamicID?: string;
        tileClickedOn?: HexCoordinate;
        finishedAnimating?: boolean;
        squaddieInstructionInProgress: SquaddieInstructionInProgress;
    } | BattleSquaddieUIInputOptions) {
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

    private _selectionState: BattleSquaddieUISelectionState;

    get selectionState(): BattleSquaddieUISelectionState {
        return this._selectionState;
    }

    private _squaddieInstructionInProgress: SquaddieInstructionInProgress;

    get squaddieInstructionInProgress(): SquaddieInstructionInProgress {
        return this._squaddieInstructionInProgress;
    }

    reset() {
        this.changeSelectionState(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    }

    changeSelectionState(newSelectionState: BattleSquaddieUISelectionState, dynamicSquaddieId?: string) {
        this._selectionState = newSelectionState;
        if (dynamicSquaddieId !== undefined && dynamicSquaddieId !== null) {
            this.selectedSquaddieDynamicID = dynamicSquaddieId;
        }
    }
}
