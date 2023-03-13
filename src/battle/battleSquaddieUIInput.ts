import {MissionMap} from "../missionMap/missionMap";
import {HexCoordinate} from "../hexMap/hexGrid";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";

export enum BattleSquaddieUISelectionState {
    UNKNOWN = "UNKNOWN",
    NO_SQUADDIE_SELECTED = "NO_SQUADDIE_SELECTED",
    SELECTED_SQUADDIE = "SELECTED_SQUADDIE",
    MOVING_SQUADDIE = "MOVING_SQUADDIE",
}

export class BattleSquaddieUIInput {
    selectedSquaddieDynamicID?: string;
    selectionState: BattleSquaddieUISelectionState;
    missionMap: MissionMap;
    tileClickedOn?: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    finishedAnimating?: boolean;
}