import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {makeError, makeResult, ResultOrError} from "../../utils/ResultOrError";
import {SnakeShapeGenerator} from "./snakeShapeGenerator";

export interface TargetingShapeGenerator {
    getShape(): TargetingShape;

    createNeighboringHexCoordinates(hexCoordinate: HexCoordinate): HexCoordinate[];
}

export enum TargetingShape {
    Unknown = 0,
    Snake = 1,
}

const TargetingShapeToName: { [value in TargetingShape]: string } = {
    [TargetingShape.Unknown]: "Unknown",
    [TargetingShape.Snake]: "Snake",
}

export const GetTargetingShapeGenerator = (shape: TargetingShape): ResultOrError<TargetingShapeGenerator, Error> => {
    switch (shape) {
        case TargetingShape.Snake:
            return makeResult(new SnakeShapeGenerator());
        default:
            return makeError(new Error(`Unexpected shape generator: ${TargetingShapeToName[shape]}`));
    }
}
