import {HexCoordinate} from "../hexGrid";

export type HexCoordinatesByDistance = {
    [distance: number]: HexCoordinate[]
};

export class ReachableSquaddiesResults {
    private coordinatesCloseToSquaddieByDistance: {
        [squaddieId: string]: HexCoordinatesByDistance
    };

    constructor() {
        this.coordinatesCloseToSquaddieByDistance = {};
    }

    addCoordinateCloseToSquaddie(squaddieId: string, distance: number, hexCoordinate: HexCoordinate) {
        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId] = {};
        }

        if (!this.coordinatesCloseToSquaddieByDistance[squaddieId][distance]) {
            this.coordinatesCloseToSquaddieByDistance[squaddieId][distance] = [];
        }

        if (this.coordinatesCloseToSquaddieByDistance[squaddieId][distance].some(
            (coordinate: HexCoordinate) => coordinate.q === hexCoordinate.q && coordinate.r === hexCoordinate.r
        )) {
            return;
        }

        this.coordinatesCloseToSquaddieByDistance[squaddieId][distance].push({q: hexCoordinate.q, r: hexCoordinate.r});
    }

    getCoordinatesCloseToSquaddieByDistance(squaddieId: string): {
        [distance: number]: HexCoordinate[]
    } {
        return this.coordinatesCloseToSquaddieByDistance[squaddieId];
    }
}
