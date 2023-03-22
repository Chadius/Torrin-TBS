import {HexGridMovementCost} from "./hexGridMovementCost";

export type HexMapLocationInfo = {
    q: number;
    r: number;
    squaddieId: string;
    tileTerrainType: HexGridMovementCost;
}
