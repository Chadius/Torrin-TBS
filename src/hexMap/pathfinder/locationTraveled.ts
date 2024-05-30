import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export interface LocationTraveled {
    hexCoordinate: HexCoordinate
    cumulativeMovementCost: number
}
