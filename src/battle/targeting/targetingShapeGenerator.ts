import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { makeError, makeResult, ResultOrError } from "../../utils/ResultOrError"
import { SnakeShapeGenerator } from "./snakeShapeGenerator"

export interface TargetingShapeGenerator {
    getShape(): TargetingShape

    createNeighboringHexCoordinates(
        hexCoordinate: HexCoordinate
    ): HexCoordinate[]
}

export enum TargetingShape {
    UNKNOWN = "UNKNOWN",
    SNAKE = "SNAKE",
}

const TargetingShapeToName: { [value in TargetingShape]: string } = {
    [TargetingShape.UNKNOWN]: "Unknown",
    [TargetingShape.SNAKE]: "Snake",
}

export const GetTargetingShapeGenerator = (
    shape: TargetingShape
): ResultOrError<TargetingShapeGenerator, Error> => {
    if (shape === TargetingShape.SNAKE) {
        return makeResult(new SnakeShapeGenerator())
    }
    return makeError(
        new Error(`Unexpected shape generator: ${TargetingShapeToName[shape]}`)
    )
}
