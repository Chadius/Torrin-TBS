import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexCoordinate/hexCoordinate"
import { getValidValueOrDefault } from "../../../utils/validityCheck"
import { HexGridService } from "../../hexGridDirection"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"

export type SearchPathByCoordinate = {
    [key: string]: SearchPathAdapter
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
        return {
            shortestPathByCoordinate,
            stopCoordinatesReached: getValidValueOrDefault(
                stopCoordinatesReached,
                []
            ),
        }
    },
    getShortestPathToCoordinate: (
        searchResults: SearchResult,
        mapCoordinate: HexCoordinate
    ): SearchPathAdapter => {
        return isCoordinateReachable(searchResults, mapCoordinate)
            ? searchResults.shortestPathByCoordinate[
                  HexCoordinateService.toString(mapCoordinate)
              ]
            : undefined
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
                !!searchResult.shortestPathByCoordinate?.[
                    HexCoordinateService.toString(candidate)
                ]
        )
    },
    getStoppableCoordinates: (searchResult: SearchResult): HexCoordinate[] => {
        return Object.entries(searchResult.shortestPathByCoordinate).reduce(
            (stoppableCoordinates, [coordinateKey, path]) => {
                if (path) {
                    stoppableCoordinates.push(
                        HexCoordinateService.fromString(coordinateKey)
                    )
                }
                return stoppableCoordinates
            },
            []
        )
    },
}

const isCoordinateReachable = (
    searchResult: SearchResult,
    mapCoordinate: HexCoordinate
): boolean =>
    !!searchResult.shortestPathByCoordinate[
        HexCoordinateService.toString(mapCoordinate)
    ]
