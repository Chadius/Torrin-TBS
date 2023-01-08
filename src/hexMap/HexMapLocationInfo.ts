import {Integer} from "./hexGrid";
import {HexGridTerrainTypes} from "./hexGridTerrainType";

export type HexMapLocationInfo = {
  q: Integer;
  r: Integer;
  squaddieId: string;
  tileTerrainType: HexGridTerrainTypes;
}
