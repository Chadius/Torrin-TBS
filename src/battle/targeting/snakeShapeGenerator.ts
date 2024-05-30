import {
    TargetingShape,
    TargetingShapeGenerator,
} from "./targetingShapeGenerator"
import {
    HexDirection,
    MoveCoordinatesInOneDirection,
} from "../../hexMap/hexGridDirection"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

// Snake paths can move in any direction except backwards.
// - They can wrap around obstacles and barricades to reach their target.
export class SnakeShapeGenerator implements TargetingShapeGenerator {
    getShape(): TargetingShape {
        return TargetingShape.SNAKE
    }

    createNeighboringHexCoordinates(
        hexCoordinate: HexCoordinate
    ): HexCoordinate[] {
        return [
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.RIGHT
            ),
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.LEFT
            ),
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.UP_LEFT
            ),
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.UP_RIGHT
            ),
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.DOWN_LEFT
            ),
            MoveCoordinatesInOneDirection(
                hexCoordinate.q,
                hexCoordinate.r,
                HexDirection.DOWN_RIGHT
            ),
        ]
    }
}
