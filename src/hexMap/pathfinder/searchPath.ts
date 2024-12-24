import { CoordinateTraveled } from "./coordinateTraveled"
import { assertsInteger } from "../../utils/mathAssert"
import { HexCoordinate } from "../hexCoordinate/hexCoordinate"

export interface SearchPath {
    coordinatesTraveled: CoordinateTraveled[]
    totalMovementCost: number
    currentNumberOfMoveActions: number
    destination?: HexCoordinate
}

export const SearchPathService = {
    getTotalMovementCost: (path: SearchPath): number => {
        return path.totalMovementCost
    },
    clone: (original: SearchPath): SearchPath => {
        const newPath: SearchPath = {
            coordinatesTraveled: [...original.coordinatesTraveled],
            totalMovementCost: original.totalMovementCost,
            currentNumberOfMoveActions: original.currentNumberOfMoveActions,
            destination: original.destination,
        }
        assertsInteger(newPath.currentNumberOfMoveActions)
        return newPath
    },
    newSearchPath: (): SearchPath => {
        return {
            coordinatesTraveled: [],
            totalMovementCost: 0,
            currentNumberOfMoveActions: 0,
            destination: undefined,
        }
    },
    add: (
        path: SearchPath,
        coordinateTraveled: CoordinateTraveled,
        costToMoveToNewCoordinate: number
    ): void => {
        path.coordinatesTraveled.push(coordinateTraveled)

        path.totalMovementCost += costToMoveToNewCoordinate

        path.destination = {
            q: coordinateTraveled.hexCoordinate.q,
            r: coordinateTraveled.hexCoordinate.r,
        }
    },
    getMostRecentCoordinate: (path: SearchPath): CoordinateTraveled => {
        if (path.coordinatesTraveled.length > 0) {
            return path.coordinatesTraveled[path.coordinatesTraveled.length - 1]
        }
        return undefined
    },
    getCoordinates: (path: SearchPath): CoordinateTraveled[] => {
        return [...path.coordinatesTraveled]
    },
    getTotalDistance: (path: SearchPath): number => {
        return path.coordinatesTraveled
            ? path.coordinatesTraveled.length - 1
            : 0
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
        const pathAAncestorIndex: number = pathA.coordinatesTraveled.findIndex(
            (tile: CoordinateTraveled) =>
                tile.hexCoordinate.q === ancestor.q &&
                tile.hexCoordinate.r === ancestor.r
        )
        if (pathAAncestorIndex < 0) {
            return false
        }

        const pathBAncestorIndex: number = pathB.coordinatesTraveled.findIndex(
            (tile: CoordinateTraveled) =>
                tile.hexCoordinate.q === ancestor.q &&
                tile.hexCoordinate.r === ancestor.r
        )
        if (pathBAncestorIndex < 0) {
            return false
        }

        return pathAAncestorIndex === pathBAncestorIndex
    },
}
