export enum HexGridTerrainTypes {
  singleMovement = 1,
  doubleMovement,
  pit,
  wall,
}


export const MovingCostByTerrainType: {[t in HexGridTerrainTypes]: number} = {
  [HexGridTerrainTypes.singleMovement]:1,
  [HexGridTerrainTypes.doubleMovement]:2,
  [HexGridTerrainTypes.pit]:1,
  [HexGridTerrainTypes.wall]:1,
};
