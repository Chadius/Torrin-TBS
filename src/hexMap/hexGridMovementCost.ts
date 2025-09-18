import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { EnumLike } from "../utils/enum"

export const HexGridMovementCost = {
    singleMovement: "singleMovement",
    doubleMovement: "doubleMovement",
    pit: "pit",
    wall: "wall",
} as const satisfies Record<string, string>

export type THexGridMovementCost = EnumLike<typeof HexGridMovementCost>

const convertStringToMovementCost = (text: string): THexGridMovementCost => {
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
    movingCostByTerrainType: (cost: THexGridMovementCost): number => {
        const movingCost = movingCostByTerrainType[cost]
        if (!movingCost) {
            throw new Error(
                `[HexGridMovementCostService.movingCost] Could not find moving cost: ${cost}`
            )
        }
        return movingCost
    },
    convertStringToMovementCost,
}

const movingCostByTerrainType: { [t in THexGridMovementCost]: number } = {
    [HexGridMovementCost.singleMovement]: 1,
    [HexGridMovementCost.doubleMovement]: 2,
    [HexGridMovementCost.pit]: 1,
    [HexGridMovementCost.wall]: 1,
}

export interface HexGridTile extends HexCoordinate {
    terrainType: THexGridMovementCost
}
