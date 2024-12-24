import { SearchPath } from "../searchPath"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { isValidValue } from "../../../utils/validityCheck"
import { HexGridService } from "../../hexGridDirection"

export type SearchPathByCoordinate = {
    [q: number]: {
        [r: number]: SearchPath
    }
}

export interface SearchResult {
    shortestPathByCoordinate: SearchPathByCoordinate
    stopCoordinatesReached: HexCoordinate[]
}

export const SearchResultsService = {
    new: ({
        shortestPathByCoordinate,
        stopCoordinatesReached,
    }: {
        shortestPathByCoordinate: SearchPathByCoordinate
        stopCoordinatesReached?: HexCoordinate[]
    }): SearchResult => {
        const deepCopySearchPathByCoordinate: SearchPathByCoordinate = {}
        for (const keyString in shortestPathByCoordinate) {
            const q: number = Number(keyString)
            deepCopySearchPathByCoordinate[q] = {
                ...shortestPathByCoordinate[q],
            }
        }
        return {
            shortestPathByCoordinate: deepCopySearchPathByCoordinate,
            stopCoordinatesReached: isValidValue(stopCoordinatesReached)
                ? stopCoordinatesReached
                : [],
        }
    },
    getShortestPathToCoordinate: (
        searchResults: SearchResult,
        q: number,
        r: number
    ): SearchPath => {
        return isCoordinateReachable(searchResults, q, r)
            ? searchResults.shortestPathByCoordinate[q][r]
            : undefined
    },
    isCoordinateReachable: (
        searchResult: SearchResult,
        q: number,
        r: number
    ): boolean => {
        return isCoordinateReachable(searchResult, q, r)
    },
    numberOfActionsToReachCoordinate: (
        searchResults: SearchResult,
        q: number,
        r: number
    ): number => {
        const shortestPath = searchResults.shortestPathByCoordinate[q][r]
        if (shortestPath === undefined) {
            return undefined
        }
        return shortestPath.currentNumberOfMoveActions
    },
    getCoordinatesByNumberOfMoveActions: (
        searchResults: SearchResult
    ): { [moveActions: number]: HexCoordinate[] } => {
        const coordinatesByNumberOfMoveActions: {
            [moveActions: number]: HexCoordinate[]
        } = {}
        for (const qStr in searchResults.shortestPathByCoordinate) {
            const q = Number(qStr)
            for (const rStr in searchResults.shortestPathByCoordinate[q]) {
                const r = Number(rStr)
                if (
                    isValidValue(searchResults.shortestPathByCoordinate[q][r])
                ) {
                    const moveActions =
                        searchResults.shortestPathByCoordinate[q][r]
                            .currentNumberOfMoveActions
                    coordinatesByNumberOfMoveActions[moveActions] ||= []
                    coordinatesByNumberOfMoveActions[moveActions].push({ q, r })
                }
            }
        }
        return coordinatesByNumberOfMoveActions
    },
    getClosestRoutesToCoordinateByDistance: (
        searchResult: SearchResult,
        coordinate: HexCoordinate,
        distanceFromCoordinate: number
    ): HexCoordinate[] => {
        const possibleCoordinatesThatAreADistanceFromTheCoordinate: HexCoordinate[] =
            HexGridService.GetCoordinatesForRingAroundCoordinate(
                coordinate,
                distanceFromCoordinate
            )

        return possibleCoordinatesThatAreADistanceFromTheCoordinate.filter(
            (candidate) =>
                !!searchResult.shortestPathByCoordinate?.[candidate.q]?.[
                    candidate.r
                ]
        )
    },
    getStoppableCoordinates: (searchResult: SearchResult): HexCoordinate[] => {
        const stoppableCoordinates: HexCoordinate[] = []
        for (const qStr in searchResult.shortestPathByCoordinate) {
            const q = Number(qStr)
            for (const rStr in searchResult.shortestPathByCoordinate[q]) {
                const r = Number(rStr)
                if (searchResult.shortestPathByCoordinate[q][r] !== undefined) {
                    stoppableCoordinates.push({ q, r })
                }
            }
        }
        return stoppableCoordinates
    },
}

const isCoordinateReachable = (
    searchResult: SearchResult,
    q: number,
    r: number
): boolean => {
    return !!searchResult.shortestPathByCoordinate?.[q]?.[r]
}
