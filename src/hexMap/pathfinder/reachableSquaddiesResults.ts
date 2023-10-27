import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export class HexCoordinatesByDistance {
    coordinatesByDistance: { [distance: number]: HexCoordinate[] };

    constructor() {
        this.coordinatesByDistance = {};
    }

    getCoordinatesByDistance(distance: number): HexCoordinate[] {
        return this.coordinatesByDistance[distance] ?? [];
    }

    getSortedDistances(): number[] {
        return Object.keys(this.coordinatesByDistance).sort((a, b) => {
            if (parseInt(a) < parseInt(b)) {
                return -1;
            }
            if (parseInt(a) > parseInt(b)) {
                return 1;
            }
            return 0;
        }).map(g => parseInt(g));
    }

    addDistanceAndCoordinate(distance: number, coordinate: HexCoordinate) {
        if (!this.coordinatesByDistance[distance]) {
            this.coordinatesByDistance[distance] = [];
        }
        this.coordinatesByDistance[distance].push(coordinate);
    }

    getDistanceFromLocation(mapLocation: HexCoordinate): number {
        const distanceStr = Object.keys(this.coordinatesByDistance).find((distanceStr: string) =>
            this.coordinatesByDistance[parseInt(distanceStr)].some((coordinate) =>
                coordinate.q === mapLocation.q && coordinate.r === mapLocation.r
            )
        );
        if (distanceStr === undefined) {
            return undefined;
        }
        return parseInt(distanceStr);
    }
}

export class ReachableSquaddieDescription {
    squaddieMapLocation: HexCoordinate
    closestCoordinatesByDistance: HexCoordinatesByDistance

    constructor(options: {
        squaddieMapLocation?: HexCoordinate,
        closestCoordinatesByDistance: HexCoordinatesByDistance
    }) {
        this.squaddieMapLocation = options.squaddieMapLocation;
        this.closestCoordinatesByDistance = options.closestCoordinatesByDistance;
    }

    getClosestAdjacentDistanceToSquaddieWithinRange(minimumDistance: number = 1) {
        const distances: number[] = this.closestCoordinatesByDistance.getSortedDistances();
        return distances.find(d => d >= minimumDistance);
    }

    getClosestAdjacentLocationToSquaddie(minimumDistance: number) {
        const closestDistance = this.getClosestAdjacentDistanceToSquaddieWithinRange(minimumDistance);
        if (closestDistance === undefined) {
            return undefined;
        }
        return this.closestCoordinatesByDistance.getCoordinatesByDistance(closestDistance)[0];
    }

    getDistanceFromLocation(mapLocation: HexCoordinate): number {
        return this.closestCoordinatesByDistance.getDistanceFromLocation(mapLocation);
    }
}

export class ReachableSquaddiesResults {
    private coordinatesCloseToSquaddieByDistance: {
        [squaddieId: string]: ReachableSquaddieDescription
    };

    constructor() {
        this.coordinatesCloseToSquaddieByDistance = {};
    }

    addCoordinateCloseToSquaddie(squaddieId: string, distance: number, hexCoordinate: HexCoordinate) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = new ReachableSquaddieDescription({
                closestCoordinatesByDistance: new HexCoordinatesByDistance()
            });
        }

        if (this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance.getCoordinatesByDistance(distance).some(
            (coordinate: HexCoordinate) => coordinate.q === hexCoordinate.q && coordinate.r === hexCoordinate.r
        )) {
            return;
        }

        this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance.addDistanceAndCoordinate(
            distance,
            {
                q: hexCoordinate.q,
                r: hexCoordinate.r
            }
        );
    }

    getCoordinatesCloseToSquaddieByDistance(squaddieId: string): ReachableSquaddieDescription {
        return this.coordinatesCloseToSquaddieByDistance[squaddieId];
    }

    addSquaddie(squaddieId: string, mapLocation: HexCoordinate) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = new ReachableSquaddieDescription({
                squaddieMapLocation: mapLocation,
                closestCoordinatesByDistance: new HexCoordinatesByDistance(),
            });
        }

        this.coordinatesCloseToSquaddieByDistance[squaddieId].squaddieMapLocation = mapLocation;
    }

    getClosestSquaddies(): {
        [squaddieId: string]: HexCoordinate
    } {
        const squaddieInfo: { [squaddieId: string]: HexCoordinate } = {};

        Object.entries(this.coordinatesCloseToSquaddieByDistance).forEach(([squaddieId, description]) => {
            squaddieInfo[squaddieId] = description.squaddieMapLocation
        });
        return squaddieInfo;
    }

    getClosestSquaddieAndClosestDistance(squaddieIds: string[]): {
        squaddieId: string,
        distance: number,
    } {
        let foundSquaddieId = "";
        let minimumDistanceToSquaddie = 0;
        squaddieIds.forEach((squaddieId) => {
            const distanceToSquaddieDescription = this.getCoordinatesCloseToSquaddieByDistance(squaddieId);
            const minimumDistance = distanceToSquaddieDescription.getClosestAdjacentDistanceToSquaddieWithinRange(1);

            if (foundSquaddieId === "" || minimumDistance === undefined || minimumDistance < minimumDistanceToSquaddie) {
                foundSquaddieId = squaddieId;
                minimumDistanceToSquaddie = minimumDistance ?? 0;
            }
        });
        if (foundSquaddieId) {
            return {
                squaddieId: foundSquaddieId,
                distance: minimumDistanceToSquaddie,
            };
        }
        return {
            squaddieId: undefined,
            distance: undefined,
        };
    }

    getCurrentDistanceFromSquaddie(targetSquaddieId: string, mapLocation: HexCoordinate): number {
        const allCoordinatesFromSquaddie = this.getCoordinatesCloseToSquaddieByDistance(targetSquaddieId);
        return allCoordinatesFromSquaddie.getDistanceFromLocation(mapLocation);
    }
}
