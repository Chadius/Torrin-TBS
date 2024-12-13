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

export const TargetingShapeGeneratorService = {
    new: (shape: TargetingShape): TargetingShapeGenerator => {
        if (shape === TargetingShape.SNAKE) {
            return new SnakeShapeGenerator()
        }

        throw new Error(
            `[TargetingShapeGeneratorService.new] Unexpected shape generator name: ${shape}`
        )
    },
    snake: () => new SnakeShapeGenerator(),
}
