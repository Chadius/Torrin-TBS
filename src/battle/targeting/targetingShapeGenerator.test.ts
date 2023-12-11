import {SnakeShapeGenerator} from "./snakeShapeGenerator";
import {GetTargetingShapeGenerator, TargetingShape} from "./targetingShapeGenerator";
import {getResultOrThrowError} from "../../utils/ResultOrError";

describe('Targeting Shape Generator', () => {
    it('generates a Snake Shape when requested', () => {
        const snake: SnakeShapeGenerator = getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE));
        expect(snake).toBeInstanceOf(SnakeShapeGenerator);
    });

    it('throws an error when asked to generate an unknown Shape', () => {
        const shouldThrowError = () => {
            getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.UNKNOWN));
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Unexpected shape generator: Unknown");
    });
});
