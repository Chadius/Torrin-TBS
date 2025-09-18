import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { SearchResult, SearchResultsService } from "./searchResult"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export const SearchResultAdapterService = {
    getShortestPathToCoordinate: ({
        searchResults,
        mapCoordinate,
    }: {
        searchResults: SearchResult
        mapCoordinate: HexCoordinate
    }): SearchPathAdapter | undefined => {
        return getShortestPathToCoordinate(searchResults, mapCoordinate)
    },
    getCoordinatesByNumberOfMoveActions: ({
        searchResults,
        movementPerAction,
    }: {
        searchResults: SearchResult
        movementPerAction: number
    }): { [moveActions: number]: HexCoordinate[] } => {
        return getCoordinatesWithPaths(searchResults).reduce(
            (
                coordinatesByMoveActions: {
                    [moveActions: number]: HexCoordinate[]
                },
                coordinate
            ) => {
                const shortestPathToCoordinate = getShortestPathToCoordinate(
                    searchResults,
                    coordinate
                )
                if (shortestPathToCoordinate) {
                    const moveActions =
                        SearchPathAdapterService.getNumberOfMoveActions({
                            path: shortestPathToCoordinate,
                            movementPerAction,
                        })
                    coordinatesByMoveActions[moveActions] ||= []
                    coordinatesByMoveActions[moveActions].push(coordinate)
                }
                return coordinatesByMoveActions
            },
            {}
        )
    },
    getClosestRoutesToCoordinateByDistance: ({
        searchResult,
        coordinate,
        distanceFromCoordinate,
    }: {
        searchResult: SearchResult
        coordinate: HexCoordinate
        distanceFromCoordinate: number
    }): HexCoordinate[] => {
        return SearchResultsService.getClosestRoutesToCoordinateByDistance(
            searchResult,
            coordinate,
            distanceFromCoordinate
        )
    },
    getCoordinatesWithPaths: (searchResult: SearchResult): HexCoordinate[] => {
        return getCoordinatesWithPaths(searchResult)
    },
}

const getCoordinatesWithPaths = (searchResult: SearchResult) => {
    return SearchResultsService.getStoppableCoordinates(searchResult)
}

const getShortestPathToCoordinate = (
    searchResults: SearchResult,
    mapCoordinate: HexCoordinate
): SearchPathAdapter | undefined => {
    return SearchResultsService.getShortestPathToCoordinate(
        searchResults,
        mapCoordinate
    )
}
