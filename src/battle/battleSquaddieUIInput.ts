import {MissionMap} from "../missionMap/missionMap";
import {HexCoordinate} from "../hexMap/hexGrid";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";

export enum BattleSquaddieUISelectionState {
    UNKNOWN = "UNKNOWN",
    NO_SQUADDIE_SELECTED = "NO_SQUADDIE_SELECTED",
    SELECTED_SQUADDIE = "SELECTED_SQUADDIE",
    MOVING_SQUADDIE = "MOVING_SQUADDIE",
}

type BattleSquaddieUIInputRequiredOptions = {
    selectionState: BattleSquaddieUISelectionState;
    missionMap: MissionMap;
    squaddieRepository: BattleSquaddieRepository;
}

type BattleSquaddieUIInputOptionalOptions = {
    selectedSquaddieDynamicID: string;
    tileClickedOn: HexCoordinate;
    finishedAnimating: boolean;
}

export type BattleSquaddieUIInputOptions = BattleSquaddieUIInputRequiredOptions & Partial<BattleSquaddieUIInputOptionalOptions>

export class BattleSquaddieUIInput {
    selectedSquaddieDynamicID?: string;
    selectionState: BattleSquaddieUISelectionState;
    missionMap: MissionMap;
    tileClickedOn?: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    finishedAnimating?: boolean;

    constructor(options: BattleSquaddieUIInputOptions) {
        this.selectedSquaddieDynamicID = options.selectedSquaddieDynamicID;
        this.selectionState = options.selectionState;
        this.missionMap = options.missionMap;
        this.tileClickedOn = options.tileClickedOn;
        this.squaddieRepository = options.squaddieRepository;
        this.finishedAnimating = options.finishedAnimating;
    }

    changeSelectionState(newSelectionState: BattleSquaddieUISelectionState, dynamicSquaddieId?: string) {
        this.selectionState = newSelectionState;
        if (dynamicSquaddieId !== undefined && dynamicSquaddieId !== null) {
            this.selectedSquaddieDynamicID = dynamicSquaddieId;
        }
    }
}