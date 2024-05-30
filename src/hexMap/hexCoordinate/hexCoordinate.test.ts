import {
    HexCoordinate,
    HexCoordinateToKey,
    ValidateHexCoordinateOrThrowError,
} from "./hexCoordinate"

describe("HexCoordinates", () => {
    it("creates HexCoordinates given q & r", () => {
        const hexCoordinate: HexCoordinate = { q: 3, r: 10 }
        expect(hexCoordinate.q).toBe(3)
        expect(hexCoordinate.r).toBe(10)
    })

    it("creates HexCoordinates given coordinates", () => {
        const hexCoordinate: HexCoordinate = { q: 3, r: 10 }
        expect(hexCoordinate.q).toBe(3)
        expect(hexCoordinate.r).toBe(10)
    })

    it("creates HexCoordinates given data", () => {
        const hexCoordinate: HexCoordinate = { q: 3, r: 10 }
        expect(hexCoordinate.q).toBe(3)
        expect(hexCoordinate.r).toBe(10)
    })

    it("throws an error if a HexCoordinate is made without arguments", () => {
        const noArguments = () => {
            ValidateHexCoordinateOrThrowError({ q: undefined, r: undefined })
        }
        expect(() => {
            noArguments()
        }).toThrow(Error)
        expect(() => {
            noArguments()
        }).toThrow("HexCoordinate requires q & r variables")

        const qIsMissing = () => {
            ValidateHexCoordinateOrThrowError({ q: undefined, r: 3 })
        }
        expect(() => {
            qIsMissing()
        }).toThrow(Error)

        expect(() => {
            qIsMissing()
        }).toThrow("HexCoordinate requires q or coordinates")

        const rIsMissing = () => {
            ValidateHexCoordinateOrThrowError({ q: 3, r: undefined })
        }
        expect(() => {
            rIsMissing()
        }).toThrow(Error)

        expect(() => {
            rIsMissing()
        }).toThrow("HexCoordinate requires r or coordinates")
    })

    it("throws an error if the coordinates are not integers", () => {
        const qIsNotAnInteger = () => {
            ValidateHexCoordinateOrThrowError({ q: 5.5, r: 3 })
        }

        expect(() => {
            qIsNotAnInteger()
        }).toThrow(Error)
        expect(() => {
            qIsNotAnInteger()
        }).toThrow("Value must be an integer: 5.5")

        const rIsNotAnInteger = () => {
            ValidateHexCoordinateOrThrowError({ q: 4, r: 3.2 })
        }

        expect(() => {
            rIsNotAnInteger()
        }).toThrow(Error)
        expect(() => {
            rIsNotAnInteger()
        }).toThrow("Value must be an integer: 3.2")

        const coordinatesDoNotHaveIntegers = () => {
            ValidateHexCoordinateOrThrowError({ q: 0.3, r: 0.5 })
        }

        expect(() => {
            coordinatesDoNotHaveIntegers()
        }).toThrow(Error)
        expect(() => {
            coordinatesDoNotHaveIntegers()
        }).toThrow("Value must be an integer: 0.3")

        const dataDoesNotHaveIntegers = () => {
            ValidateHexCoordinateOrThrowError({ q: 0.3, r: 0.5 })
        }

        expect(() => {
            dataDoesNotHaveIntegers()
        }).toThrow(Error)
        expect(() => {
            dataDoesNotHaveIntegers()
        }).toThrow("Value must be an integer: 0.3")
    })

    it("can create a string key", () => {
        const hexCoordinate: HexCoordinate = { q: 3, r: 10 }
        expect(HexCoordinateToKey(hexCoordinate)).toBe("3,10")
    })
})
