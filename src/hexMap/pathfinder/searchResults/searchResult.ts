import {SearchPath} from "../searchPath";
import {HexCoordinate} from "../../hexCoordinate/hexCoordinate";

export type SearchPathByLocation = {
    [q: number]: {
        [r: number]: SearchPath;
    }
}

export interface SearchResult {
    shortestPathByLocation: SearchPathByLocation;
}

export const SearchResultsHelper = {
    new: ({shortestPathByLocation}: {shortestPathByLocation: SearchPathByLocation}): SearchResult => {
        const deepCopySearchPathByLocation: SearchPathByLocation = {};
        for (const keyString in shortestPathByLocation) {
            const q: number = Number(keyString);
            deepCopySearchPathByLocation[q] = {...shortestPathByLocation[q]}
        }
        return {
            shortestPathByLocation: deepCopySearchPathByLocation
        };
    },
    getShortestPathToLocation: (searchResults: SearchResult, q: number, r: number): SearchPath => {
        return searchResults.shortestPathByLocation[q][r];
    },
    isLocationReachable: (searchResults: SearchResult, q: number, r: number): boolean => {
        return searchResults.shortestPathByLocation[q][r] !== undefined;
    },
    numberOfActionsToReachLocation: (searchResults: SearchResult, q: number, r: number): number =>  {
        const shortestPath = searchResults.shortestPathByLocation[q][r];
        if (shortestPath === undefined) {
            return undefined;
        }
        return shortestPath.currentNumberOfMoveActions;
    },
    getLocationsByNumberOfMoveActions: (searchResults: SearchResult): {[moveActions: number]: HexCoordinate[]} => {
        const locationsByNumberOfMoveActions: {[moveActions: number]: HexCoordinate[]} = {};
        for (const qStr in searchResults.shortestPathByLocation) {
            const q = Number(qStr);
            for (const rStr in searchResults.shortestPathByLocation[q]) {
                const r = Number(rStr);
                const moveActions = searchResults.shortestPathByLocation[q][r].currentNumberOfMoveActions;
                locationsByNumberOfMoveActions[moveActions] ||= [];
                locationsByNumberOfMoveActions[moveActions].push({q, r});
            }
        }
        return locationsByNumberOfMoveActions;
    }
};
