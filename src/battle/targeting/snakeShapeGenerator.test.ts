import {SnakeShapeGenerator} from "./snakeShapeGenerator";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

describe('Snake Shape', () => {
    it('generates neighboring tiles in all directions', () => {
        const snakeShapeGenerator: SnakeShapeGenerator = new SnakeShapeGenerator();
        const neighbors: HexCoordinate[] = snakeShapeGenerator.createNeighboringHexCoordinates({q: 1, r: 1});
        expect(neighbors).toHaveLength(6);
        expect(neighbors).toContainEqual({q: 1, r: 2});
        expect(neighbors).toContainEqual({q: 1, r: 0});
        expect(neighbors).toContainEqual({q: 0, r: 2});
        expect(neighbors).toContainEqual({q: 0, r: 1});
        expect(neighbors).toContainEqual({q: 2, r: 1});
        expect(neighbors).toContainEqual({q: 2, r: 0});
    });
});
