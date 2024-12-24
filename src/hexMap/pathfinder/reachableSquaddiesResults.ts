import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export class HexCoordinatesByDistance {
    coordinatesByDistance: {
        [distance: number]: HexCoordinate[]
    }

    constructor() {
        this.coordinatesByDistance = {}
    }

    getCoordinatesByDistance(distance: number): HexCoordinate[] {
        return this.coordinatesByDistance[distance] ?? []
    }

    getSortedDistances(): number[] {
        return Object.keys(this.coordinatesByDistance)
            .sort((a, b) => {
                if (parseInt(a) < parseInt(b)) {
                    return -1
                }
                if (parseInt(a) > parseInt(b)) {
                    return 1
                }
                return 0
            })
            .map((g) => parseInt(g))
    }

    addDistanceAndCoordinate(distance: number, coordinate: HexCoordinate) {
        if (!this.coordinatesByDistance[distance]) {
            this.coordinatesByDistance[distance] = []
        }
        this.coordinatesByDistance[distance].push(coordinate)
    }

    getDistanceFromCoordinate(mapCoordinate: HexCoordinate): number {
        const distanceStr = Object.keys(this.coordinatesByDistance).find(
            (distanceStr: string) =>
                this.coordinatesByDistance[parseInt(distanceStr)].some(
                    (coordinate) =>
                        coordinate.q === mapCoordinate.q &&
                        coordinate.r === mapCoordinate.r
                )
        )
        if (distanceStr === undefined) {
            return undefined
        }
        return parseInt(distanceStr)
    }
}

export class ReachableSquaddieDescription {
    squaddieMapCoordinate: HexCoordinate
    closestCoordinatesByDistance: HexCoordinatesByDistance

    constructor(options: {
        squaddieMapCoordinate?: HexCoordinate
        closestCoordinatesByDistance: HexCoordinatesByDistance
    }) {
        this.squaddieMapCoordinate = options.squaddieMapCoordinate
        this.closestCoordinatesByDistance = options.closestCoordinatesByDistance
    }

    getClosestAdjacentDistanceToSquaddieWithinRange(
        minimumDistance: number = 1
    ) {
        const distances: number[] =
            this.closestCoordinatesByDistance.getSortedDistances()
        return distances.find((d) => d >= minimumDistance)
    }

    getClosestAdjacentLocationToSquaddie(minimumDistance: number) {
        const closestDistance =
            this.getClosestAdjacentDistanceToSquaddieWithinRange(
                minimumDistance
            )
        if (closestDistance === undefined) {
            return undefined
        }
        return this.closestCoordinatesByDistance.getCoordinatesByDistance(
            closestDistance
        )[0]
    }

    getDistanceFromLocation(mapCoordinate: HexCoordinate): number {
        return this.closestCoordinatesByDistance.getDistanceFromCoordinate(
            mapCoordinate
        )
    }
}

export class ReachableSquaddiesResults {
    private coordinatesCloseToSquaddieByDistance: {
        [squaddieId: string]: ReachableSquaddieDescription
    }

    constructor() {
        this.coordinatesCloseToSquaddieByDistance = {}
    }

    addCoordinateCloseToSquaddie(
        squaddieId: string,
        distance: number,
        hexCoordinate: HexCoordinate
    ) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] =
                new ReachableSquaddieDescription({
                    closestCoordinatesByDistance:
                        new HexCoordinatesByDistance(),
                })
        }

        if (
            this.coordinatesCloseToSquaddieByDistance[
                squaddieId
            ].closestCoordinatesByDistance
                .getCoordinatesByDistance(distance)
                .some(
                    (coordinate: HexCoordinate) =>
                        coordinate.q === hexCoordinate.q &&
                        coordinate.r === hexCoordinate.r
                )
        ) {
            return
        }

        this.coordinatesCloseToSquaddieByDistance[
            squaddieId
        ].closestCoordinatesByDistance.addDistanceAndCoordinate(distance, {
            q: hexCoordinate.q,
            r: hexCoordinate.r,
        })
    }

    getCoordinatesCloseToSquaddieByDistance(
        squaddieId: string
    ): ReachableSquaddieDescription {
        return this.coordinatesCloseToSquaddieByDistance[squaddieId]
    }

    addSquaddie(squaddieId: string, mapCoordinate: HexCoordinate) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] =
                new ReachableSquaddieDescription({
                    squaddieMapCoordinate: mapCoordinate,
                    closestCoordinatesByDistance:
                        new HexCoordinatesByDistance(),
                })
        }

        this.coordinatesCloseToSquaddieByDistance[
            squaddieId
        ].squaddieMapCoordinate = mapCoordinate
    }
}
