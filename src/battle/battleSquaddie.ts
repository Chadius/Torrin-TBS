import {SquaddieID} from "../squaddie/id";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {HexCoordinate} from "../hexMap/hexGrid";
import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";

export type BattleSquaddieStatic = {
  squaddieID: SquaddieID,
  movement: SquaddieMovement,
  activities: SquaddieActivity[],
}

export type BattleSquaddieDynamic = {
  staticSquaddieId: string,
  mapLocation: HexCoordinate,
  squaddieTurn: SquaddieTurn,
  mapIcon?: ImageUI,
}
