import {HexCoordinate, Integer} from "./hexGrid";
import {HexDirection, moveCoordinatesInOneDirection, moveOneTileInDirection} from "./hexGridDirection";

describe('Move Hex Coordinate in one direction', () => {
    let origin: HexCoordinate;
    beforeEach(() => {
        origin = {q: 0 as Integer, r: 0 as Integer};
    });

    it('Can stay at origin', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.ORIGIN);
        expect(destination.q).toBe(origin.q);
        expect(destination.r).toBe(origin.r);
    });

    it('Can move right', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.RIGHT);
        expect(destination.q).toBe(origin.q);
        expect(destination.r).toBe(origin.r + 1);
    });

    it('Can move left', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.LEFT);
        expect(destination.q).toBe(origin.q);
        expect(destination.r).toBe(origin.r - 1);
    });

    it('Can move down and right', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.DOWN_RIGHT);
        expect(destination.q).toBe(origin.q + 1);
        expect(destination.r).toBe(origin.r);
    });

    it('Can move down and left', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.DOWN_LEFT);
        expect(destination.q).toBe(origin.q + 1);
        expect(destination.r).toBe(origin.r - 1);
    });

    it('Can move up and left', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.UP_LEFT);
        expect(destination.q).toBe(origin.q - 1);
        expect(destination.r).toBe(origin.r);
    });

    it('Can move up and right', () => {
        const destination = moveOneTileInDirection(origin, HexDirection.UP_RIGHT);
        expect(destination.q).toBe(origin.q - 1);
        expect(destination.r).toBe(origin.r + 1);
    });
});

describe('Move q r coordinates in one direction', () => {
    it('Can stay at origin', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.ORIGIN);
        expect(destination[0]).toBe(0);
        expect(destination[1]).toBe(0);
    });

    it('Can move right', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.RIGHT);
        expect(destination[0]).toBe(0);
        expect(destination[1]).toBe(1);
    });

    it('Can move left', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.LEFT);
        expect(destination[0]).toBe(0);
        expect(destination[1]).toBe(-1);
    });

    it('Can move down and right', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.DOWN_RIGHT);
        expect(destination[0]).toBe(+1);
        expect(destination[1]).toBe(0);
    });

    it('Can move down and left', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.DOWN_LEFT);
        expect(destination[0]).toBe(1);
        expect(destination[1]).toBe(-1);
    });

    it('Can move up and left', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.UP_LEFT);
        expect(destination[0]).toBe(-1);
        expect(destination[1]).toBe(0);
    });

    it('Can move up and right', () => {
        const destination = moveCoordinatesInOneDirection(0, 0, HexDirection.UP_RIGHT);
        expect(destination[0]).toBe(-1);
        expect(destination[1]).toBe(1);
    });
});
