export enum HexGridTerrainTypes {
  singleMovement = 1,
  doubleMovement,
  pit,
  wall,
}

export const ConvertStringToMovementCost = (text: string): HexGridTerrainTypes => {
  switch (true) {
    case text.length === 0:
      return HexGridTerrainTypes.wall;
    case text[0] === '1':
      return HexGridTerrainTypes.singleMovement;
    case text[0] === '2':
      return HexGridTerrainTypes.doubleMovement;
    case text[0] === 'O':
      return HexGridTerrainTypes.pit;
    case text[0] === '-':
      return HexGridTerrainTypes.pit;
    case text[0] === '_':
      return HexGridTerrainTypes.pit;
    default:
      return HexGridTerrainTypes.wall;
  }
}

export const MovingCostByTerrainType: {[t in HexGridTerrainTypes]: number} = {
  [HexGridTerrainTypes.singleMovement]:1,
  [HexGridTerrainTypes.doubleMovement]:2,
  [HexGridTerrainTypes.pit]:1,
  [HexGridTerrainTypes.wall]:1,
};
