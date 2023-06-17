import {HexCoordinate2} from "./hexCoordinate";

describe('HexCoordinates', () => {
    it('creates HexCoordinates given q & r', () => {
        const hexCoordinate: HexCoordinate2 = new HexCoordinate2({q: 3, r: 10});
        expect(hexCoordinate.q).toBe(3);
        expect(hexCoordinate.r).toBe(10);
    });

    it('creates HexCoordinates given coordinates', () => {
        const hexCoordinate: HexCoordinate2 = new HexCoordinate2({coordinates: [3, 10]});
        expect(hexCoordinate.q).toBe(3);
        expect(hexCoordinate.r).toBe(10);
    });

    it('throws an error if a HexCoordinate is made without arguments', () => {
        const qIsMissing = () => {
            new HexCoordinate2({r: 3});
        };

        expect(() => {
            qIsMissing()
        }).toThrow(Error);
        expect(() => {
            qIsMissing()
        }).toThrow("HexCoordinate requires q or coordinates");

        const rIsMissing = () => {
            new HexCoordinate2({q: 3});
        };

        expect(() => {
            rIsMissing()
        }).toThrow(Error);
        expect(() => {
            rIsMissing()
        }).toThrow("HexCoordinate requires r or coordinates");

        const coordinatesAreMissing = () => {
            new HexCoordinate2({});
        };
        expect(() => {
            coordinatesAreMissing()
        }).toThrow(Error);
        expect(() => {
            coordinatesAreMissing()
        }).toThrow("HexCoordinate requires q & r or coordinates");
    });

    it('throws an error if the coordinates are not integers', () => {
        const qIsNotAnInteger = () => {
            new HexCoordinate2({q: 5.5, r: 3});
        };

        expect(() => {
            qIsNotAnInteger()
        }).toThrow(Error);
        expect(() => {
            qIsNotAnInteger()
        }).toThrow("Value must be an integer: 5.5");

        const rIsNotAnInteger = () => {
            new HexCoordinate2({q: 4, r: 3.2});
        };

        expect(() => {
            rIsNotAnInteger()
        }).toThrow(Error);
        expect(() => {
            rIsNotAnInteger()
        }).toThrow("Value must be an integer: 3.2");

        const coordinatesDoNotHaveIntegers = () => {
            new HexCoordinate2({coordinates: [0.3, 0.5]});
        };

        expect(() => {
            coordinatesDoNotHaveIntegers()
        }).toThrow(Error);
        expect(() => {
            coordinatesDoNotHaveIntegers()
        }).toThrow("Value must be an integer: 0.3");
    });
});
