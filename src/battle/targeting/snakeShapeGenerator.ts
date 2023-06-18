import {TargetingShape, TargetingShapeGenerator} from "./targetingShapeGenerator";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {HexDirection, moveCoordinatesInOneDirection} from "../../hexMap/hexGridDirection";

// Snake paths can move in any direction except backwards.
// - They can wrap around obstacles and barricades to reach their target.
export class SnakeShapeGenerator implements TargetingShapeGenerator {
    getShape(): TargetingShape {
        return TargetingShape.Snake;
    }

    createNeighboringHexCoordinates(hexCoordinate: HexCoordinate): HexCoordinate[] {
        return [
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.RIGHT),
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.LEFT),
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.UP_LEFT),
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.UP_RIGHT),
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.DOWN_LEFT),
            moveCoordinatesInOneDirection(hexCoordinate.q, hexCoordinate.r, HexDirection.DOWN_RIGHT),
        ];
    }
}
