import {Integer} from "./hexGrid";
import {HexGridMovementCost} from "./hexGridMovementCost";

export type HexMapLocationInfo = {
    q: Integer;
    r: Integer;
    squaddieId: string;
    tileTerrainType: HexGridMovementCost;
}

export const SquaddieCanStopMovingOnTile = (mapInfo: HexMapLocationInfo): boolean => {
    return ![HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
            mapInfo.tileTerrainType
        )
        && mapInfo.squaddieId === undefined;
}
