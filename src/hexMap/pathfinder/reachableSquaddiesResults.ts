import {HexCoordinate} from "../hexGrid";

export type HexCoordinatesByDistance = {
    [distance: number]: HexCoordinate[]
};

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

    getClosestAdjacentDistanceToSquaddie() {
        const distances: number[] = Object.keys(this.closestCoordinatesByDistance).sort((a, b) => {
            if (parseInt(a) < parseInt(b)) {
                return -1;
            }
            if (parseInt(a) > parseInt(b)) {
                return 1;
            }
            return 0;
        }).map(g => parseInt(g));
        return distances.find(d => d > 0);
    }

    getClosestAdjacentLocationToSquaddie() {
        const closestDistance = this.getClosestAdjacentDistanceToSquaddie();
        if (closestDistance === undefined) {
            return undefined;
        }
        return this.closestCoordinatesByDistance[closestDistance][0];
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
                closestCoordinatesByDistance: {}
            });
        }

        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance[distance]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance[distance] = [];
        }

        if (this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance[distance].some(
            (coordinate: HexCoordinate) => coordinate.q === hexCoordinate.q && coordinate.r === hexCoordinate.r
        )) {
            return;
        }

        this.coordinatesCloseToSquaddieByDistance[squaddieId].closestCoordinatesByDistance[distance].push({
            q: hexCoordinate.q,
            r: hexCoordinate.r
        });
    }

    getCoordinatesCloseToSquaddieByDistance(squaddieId: string): ReachableSquaddieDescription {
        return this.coordinatesCloseToSquaddieByDistance[squaddieId];
    }

    addSquaddie(squaddieId: string, mapLocation: { q: number; r: number }) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = new ReachableSquaddieDescription({
                squaddieMapLocation: mapLocation,
                closestCoordinatesByDistance: {}
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

    getClosestSquaddie(squaddieIds: string[]) {
        let foundSquaddieId = "";
        let minimumDistanceToSquaddie = 0;
        squaddieIds.forEach((squaddieId) => {
            const distanceToSquaddieDescription = this.getCoordinatesCloseToSquaddieByDistance(squaddieId);
            const minimumDistance = distanceToSquaddieDescription.getClosestAdjacentDistanceToSquaddie();

            if (foundSquaddieId === "" || minimumDistance === undefined || minimumDistance < minimumDistanceToSquaddie) {
                foundSquaddieId = squaddieId;
                minimumDistanceToSquaddie = minimumDistance ?? 0;
            }
        });
        return foundSquaddieId;
    }
}
