import {HexGridMovementCost} from "./hexGridMovementCost";

export type Integer = number & {_brand: 'Integer'}
export type HexCoordinate = {q: Integer, r: Integer}

export class HexGridTile {
  q: Integer;
  r: Integer;
  terrainType: HexGridMovementCost;

  constructor(qcoord: Integer, rcoord: Integer, appearance: HexGridMovementCost) {
    this.r = rcoord;
    this.q = qcoord;
    this.terrainType = appearance;
  }
}
