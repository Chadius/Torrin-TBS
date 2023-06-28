import {MissionMap} from "../missionMap/missionMap";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {CurrentSquaddieInstruction} from "./history/currentSquaddieInstruction";

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
    currentlyActingSquaddie?: CurrentSquaddieInstruction;
}

export class BattleSquaddieUIInput {
    private _selectionState: BattleSquaddieUISelectionState;
    private _currentlyActingSquaddie: CurrentSquaddieInstruction;
    selectedSquaddieDynamicID?: string;
    missionMap: MissionMap;
    tileClickedOn?: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    finishedAnimating?: boolean;

    constructor(options: BattleSquaddieUIInputOptions) {
        this.selectedSquaddieDynamicID = options.selectedSquaddieDynamicID;
        this._selectionState = options.selectionState;
        this.missionMap = options.missionMap;
        this.tileClickedOn = options.tileClickedOn;
        this.squaddieRepository = options.squaddieRepository;
        this.finishedAnimating = options.finishedAnimating;
        this._currentlyActingSquaddie = options.currentlyActingSquaddie;
    }

    changeSelectionState(newSelectionState: BattleSquaddieUISelectionState, dynamicSquaddieId?: string) {
        this._selectionState = newSelectionState;
        if (dynamicSquaddieId !== undefined && dynamicSquaddieId !== null) {
            this.selectedSquaddieDynamicID = dynamicSquaddieId;
        }
    }

    get selectionState(): BattleSquaddieUISelectionState {
        return this._selectionState;
    }

    get currentlyActingSquaddie(): CurrentSquaddieInstruction {
        return this._currentlyActingSquaddie;
    }
}
