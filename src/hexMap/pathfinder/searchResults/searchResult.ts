import {SearchPath} from "../searchPath";
import {HexCoordinate} from "../../hexCoordinate/hexCoordinate";
import {isValidValue} from "../../../utils/validityCheck";
import {HexGridHelper} from "../../hexGridDirection";

export type SearchPathByLocation = {
    [q: number]: {
        [r: number]: SearchPath;
    }
}

export interface SearchResult {
    shortestPathByLocation: SearchPathByLocation;
    stopLocationsReached: HexCoordinate[];
}

export const SearchResultsService = {
    new: ({shortestPathByLocation, stopLocationsReached}: {
        shortestPathByLocation: SearchPathByLocation,
        stopLocationsReached?: HexCoordinate[]
    }): SearchResult => {
        const deepCopySearchPathByLocation: SearchPathByLocation = {};
        for (const keyString in shortestPathByLocation) {
            const q: number = Number(keyString);
            deepCopySearchPathByLocation[q] = {...shortestPathByLocation[q]}
        }
        return {
            shortestPathByLocation: deepCopySearchPathByLocation,
            stopLocationsReached: isValidValue(stopLocationsReached) ? stopLocationsReached : [],
        };
    },
    getShortestPathToLocation: (searchResults: SearchResult, q: number, r: number): SearchPath => {
        return isLocationReachable(searchResults, q, r)
            ? searchResults.shortestPathByLocation[q][r]
            : undefined;
    },
    isLocationReachable: (searchResult: SearchResult, q: number, r: number): boolean => {
        return isLocationReachable(searchResult, q, r);
    },
    numberOfActionsToReachLocation: (searchResults: SearchResult, q: number, r: number): number => {
        const shortestPath = searchResults.shortestPathByLocation[q][r];
        if (shortestPath === undefined) {
            return undefined;
        }
        return shortestPath.currentNumberOfMoveActions;
    },
    getLocationsByNumberOfMoveActions: (searchResults: SearchResult): { [moveActions: number]: HexCoordinate[] } => {
        const locationsByNumberOfMoveActions: { [moveActions: number]: HexCoordinate[] } = {};
        for (const qStr in searchResults.shortestPathByLocation) {
            const q = Number(qStr);
            for (const rStr in searchResults.shortestPathByLocation[q]) {
                const r = Number(rStr);
                if (isValidValue(searchResults.shortestPathByLocation[q][r])) {
                    const moveActions = searchResults.shortestPathByLocation[q][r].currentNumberOfMoveActions;
                    locationsByNumberOfMoveActions[moveActions] ||= [];
                    locationsByNumberOfMoveActions[moveActions].push({q, r});
                }
            }
        }
        return locationsByNumberOfMoveActions;
    },
    getClosestRoutesToLocationByDistance: (searchResult: SearchResult, location: HexCoordinate, distanceFromLocation: number): HexCoordinate[] => {
        const possibleLocationsThatAreADistanceFromTheLocation: HexCoordinate[] = HexGridHelper.GetCoordinatesForRingAroundCoordinate(location, distanceFromLocation);

        return possibleLocationsThatAreADistanceFromTheLocation.filter(candidate =>
            searchResult.shortestPathByLocation[candidate.q] != undefined
            && searchResult.shortestPathByLocation[candidate.q][candidate.r] !== undefined
        );
    },
    getStoppableLocations: (searchResult: SearchResult): HexCoordinate[] => {
        const stoppableLocations: HexCoordinate[] = [];
        for (const qStr in searchResult.shortestPathByLocation) {
            const q = Number(qStr);
            for (const rStr in searchResult.shortestPathByLocation[q]) {
                const r = Number(rStr);
                if (searchResult.shortestPathByLocation[q][r] !== undefined) {
                    stoppableLocations.push({q, r});
                }
            }
        }
        return stoppableLocations;
    },
};

const isLocationReachable = (searchResult: SearchResult, q: number, r: number): boolean => {
    return searchResult.shortestPathByLocation[q] != undefined
        && searchResult.shortestPathByLocation[q][r] !== undefined
};
