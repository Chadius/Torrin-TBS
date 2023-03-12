export enum HexGridMovementCost {
    singleMovement = 1,
    doubleMovement,
    pit,
    wall,
}

export const convertStringToMovementCost = (text: string): HexGridMovementCost => {
    switch (true) {
        case text.length === 0:
            return HexGridMovementCost.wall;
        case text[0] === '1':
            return HexGridMovementCost.singleMovement;
        case text[0] === '2':
            return HexGridMovementCost.doubleMovement;
        case text[0] === 'O':
            return HexGridMovementCost.pit;
        case text[0] === '-':
            return HexGridMovementCost.pit;
        case text[0] === '_':
            return HexGridMovementCost.pit;
        default:
            return HexGridMovementCost.wall;
    }
}

export const MovingCostByTerrainType: { [t in HexGridMovementCost]: number } = {
    [HexGridMovementCost.singleMovement]: 1,
    [HexGridMovementCost.doubleMovement]: 2,
    [HexGridMovementCost.pit]: 1,
    [HexGridMovementCost.wall]: 1,
};
