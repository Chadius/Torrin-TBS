import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"

export enum CoordinateGeneratorShape {
    BLOOM = "BLOOM",
}

export type BloomShapeData = {
    distance: number
}

export const CoordinateGeneratorService = {
    generateCoordinates: ({
        origin,
        shape,
        shapeData,
    }: {
        origin: HexCoordinate
        shape: CoordinateGeneratorShape
        shapeData: BloomShapeData
    }): HexCoordinate[] => {
        if (shape === CoordinateGeneratorShape.BLOOM) {
            return generateCoordinatesBloom({ origin, shape, shapeData })
        }
        return []
    },
}

const generateCoordinatesBloom = ({
    origin,
    shapeData,
}: {
    origin: HexCoordinate
    shape: CoordinateGeneratorShape
    shapeData: BloomShapeData
}): HexCoordinate[] => {
    const newCoordinates: { [key: string]: HexCoordinate } = {
        [`${origin.q},${origin.r}`]: { q: origin.q, r: origin.r },
    }

    for (let i = 0; i < shapeData.distance; i++) {
        let newCoordinatesFound = Object.values(newCoordinates)
            .map((coordinate) =>
                HexCoordinateService.createNewNeighboringCoordinates(coordinate)
            )
            .flat()
            .filter(
                (coordinate) =>
                    newCoordinates[`${coordinate.q},${coordinate.r}`] ==
                    undefined
            )

        newCoordinatesFound.forEach(
            (coordinate) =>
                (newCoordinates[`${coordinate.q},${coordinate.r}`] = coordinate)
        )
    }

    return Object.values(newCoordinates)
}
