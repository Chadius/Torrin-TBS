import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export interface CoordinateTraveled {
    hexCoordinate: HexCoordinate
    cumulativeMovementCost: number
}
