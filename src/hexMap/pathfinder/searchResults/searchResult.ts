import {SearchPath} from "../searchPath";

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
    }
};
