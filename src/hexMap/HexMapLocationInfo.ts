import {Integer} from "./hexGrid";
import {HexGridMovementCost} from "./hexGridMovementCost";

export type HexMapLocationInfo = {
    q: Integer;
    r: Integer;
    squaddieId: string;
    tileTerrainType: HexGridMovementCost;
}
