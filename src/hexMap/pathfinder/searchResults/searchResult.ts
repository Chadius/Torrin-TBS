import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexCoordinate/hexCoordinate"
import { getValidValueOrDefault } from "../../../utils/objectValidityCheck"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"

export interface SearchResult {
    id: string
    shortestPathByCoordinate: SearchPathByCoordinate
    stopCoordinatesReached: HexCoordinate[]
}

export type SearchPathByCoordinate = {
    [key: string]: SearchPathAdapter
}

export const SearchResultsService = {
    new: ({
        id,
        shortestPathByCoordinate,
        stopCoordinatesReached,
    }: {
        id: string
        shortestPathByCoordinate: SearchPathByCoordinate
        stopCoordinatesReached?: HexCoordinate[]
    }): SearchResult => {
        return {
            id,
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
            HexCoordinateService.getCoordinatesForRingAroundCoordinate(
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
