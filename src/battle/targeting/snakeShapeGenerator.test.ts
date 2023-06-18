import {SnakeShapeGenerator} from "./snakeShapeGenerator";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

describe('Snake Shape', () => {
    it('generates neighboring tiles in all directions', () => {
        const snakeShapeGenerator: SnakeShapeGenerator = new SnakeShapeGenerator();
        const neighbors: HexCoordinate[] = snakeShapeGenerator.createNeighboringHexCoordinates(new HexCoordinate({coordinates: [1, 1]}));
        expect(neighbors).toHaveLength(6);
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [1, 2]}));
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [1, 0]}));
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [0, 2]}));
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [0, 1]}));
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [2, 1]}));
        expect(neighbors).toContainEqual(new HexCoordinate({coordinates: [2, 0]}));
    });
});
