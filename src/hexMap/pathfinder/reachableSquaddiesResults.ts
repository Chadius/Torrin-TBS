import {HexCoordinate} from "../hexGrid";

export type HexCoordinatesByDistance = {
    [distance: number]: HexCoordinate[]
};

export type ReachableSquaddieDescription = {
    squaddieMapLocation: HexCoordinate
    closestCoordinatesByDistance: HexCoordinatesByDistance
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
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = {
                squaddieMapLocation: undefined,
                closestCoordinatesByDistance: {}
            };
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
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = {
                squaddieMapLocation: mapLocation,
                closestCoordinatesByDistance: {}
            };
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
}
