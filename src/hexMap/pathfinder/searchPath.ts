import { LocationTraveled } from "./locationTraveled"
import { assertsInteger } from "../../utils/mathAssert"
import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export interface SearchPath {
    locationsTraveled: LocationTraveled[]
    totalMovementCost: number
    currentNumberOfMoveActions: number
    destination?: HexCoordinate
}

export const SearchPathHelper = {
    getTotalMovementCost: (path: SearchPath): number => {
        return path.totalMovementCost
    },
    clone: (original: SearchPath): SearchPath => {
        const newPath: SearchPath = {
            locationsTraveled: [...original.locationsTraveled],
            totalMovementCost: original.totalMovementCost,
            currentNumberOfMoveActions: original.currentNumberOfMoveActions,
            destination: original.destination,
        }
        assertsInteger(newPath.currentNumberOfMoveActions)
        return newPath
    },
    newSearchPath: (): SearchPath => {
        return {
            locationsTraveled: [],
            totalMovementCost: 0,
            currentNumberOfMoveActions: 0,
            destination: undefined,
        }
    },
    add: (
        path: SearchPath,
        locationTraveled: LocationTraveled,
        costToMoveToNewLocation: number
    ): void => {
        path.locationsTraveled.push(locationTraveled)

        path.totalMovementCost += costToMoveToNewLocation

        path.destination = {
            q: locationTraveled.hexCoordinate.q,
            r: locationTraveled.hexCoordinate.r,
        }
    },
    getMostRecentLocation: (path: SearchPath): LocationTraveled => {
        if (path.locationsTraveled.length > 0) {
            return path.locationsTraveled[path.locationsTraveled.length - 1]
        }
        return undefined
    },
    getLocations: (path: SearchPath): LocationTraveled[] => {
        return [...path.locationsTraveled]
    },
    getTotalDistance: (path: SearchPath): number => {
        return path.locationsTraveled ? path.locationsTraveled.length - 1 : 0
    },
    startNewMovementAction: (
        path: SearchPath,
        incrementMoveActionCount: boolean = true
    ): void => {
        if (incrementMoveActionCount) {
            path.currentNumberOfMoveActions++
        }
    },
    compare: (a: SearchPath, b: SearchPath) => {
        if (a.totalMovementCost < b.totalMovementCost) {
            return -1
        }
        if (a.totalMovementCost > b.totalMovementCost) {
            return 1
        }
        return 0
    },
    pathsHaveTheSameAncestor: ({
        pathA,
        pathB,
        ancestor,
    }: {
        pathA: SearchPath
        pathB: SearchPath
        ancestor: HexCoordinate
    }): boolean => {
        const pathAAncestorIndex: number = pathA.locationsTraveled.findIndex(
            (tile: LocationTraveled) =>
                tile.hexCoordinate.q === ancestor.q &&
                tile.hexCoordinate.r === ancestor.r
        )
        if (pathAAncestorIndex < 0) {
            return false
        }

        const pathBAncestorIndex: number = pathB.locationsTraveled.findIndex(
            (tile: LocationTraveled) =>
                tile.hexCoordinate.q === ancestor.q &&
                tile.hexCoordinate.r === ancestor.r
        )
        if (pathBAncestorIndex < 0) {
            return false
        }

        return pathAAncestorIndex === pathBAncestorIndex
    },
}
