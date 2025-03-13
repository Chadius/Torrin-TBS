export enum HexGridMovementCost {
    singleMovement = "singleMovement",
    doubleMovement = "doubleMovement",
    pit = "pit",
    wall = "wall",
}

export const convertStringToMovementCost = (
    text: string
): HexGridMovementCost => {
    switch (true) {
        case text.length === 0:
            return HexGridMovementCost.wall
        case text.startsWith("1"):
            return HexGridMovementCost.singleMovement
        case text.startsWith("2"):
            return HexGridMovementCost.doubleMovement
        case text.startsWith("O"):
            return HexGridMovementCost.pit
        case text.startsWith("-"):
            return HexGridMovementCost.pit
        case text.startsWith("_"):
            return HexGridMovementCost.pit
        default:
            return HexGridMovementCost.wall
    }
}

export const HexGridMovementCostService = {
    movingCostByTerrainType: (cost: HexGridMovementCost) =>
        MovingCostByTerrainType[cost],
}

export const MovingCostByTerrainType: { [t in HexGridMovementCost]: number } = {
    [HexGridMovementCost.singleMovement]: 1,
    [HexGridMovementCost.doubleMovement]: 2,
    [HexGridMovementCost.pit]: 1,
    [HexGridMovementCost.wall]: 1,
}
