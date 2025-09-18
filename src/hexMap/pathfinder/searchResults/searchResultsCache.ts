import { SearchResult } from "./searchResult"
import { MapSearchService } from "../pathGeneration/mapSearch"
import { SearchLimit } from "../pathGeneration/searchLimit"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../../battle/objectRepository"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexCoordinate/hexCoordinate"

export interface SearchResultsCache {
    squaddieAllMovement: {
        [battleSquaddieId: string]: {
            [originMapLocationString: string]: SearchResult
        }
    }
}

enum SearchResultsCacheType {
    SQUADDIE_ALL_MOVEMENT = "SQUADDIE_ALL_MOVEMENT",
}

export const SearchResultsCacheService = {
    new: (): SearchResultsCache => {
        return {
            squaddieAllMovement: {},
        }
    },
    calculateSquaddieAllMovement: ({
        searchLimit,
        searchResultsCache,
        battleSquaddieId,
        originMapCoordinate,
        currentMapCoordinate,
        missionMap,
        objectRepository,
    }: {
        searchResultsCache: SearchResultsCache | undefined
        battleSquaddieId: string
        originMapCoordinate: HexCoordinate
        currentMapCoordinate: HexCoordinate | undefined
        searchLimit: SearchLimit
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }) => {
        if (searchResultsCache == undefined) return
        const secondaryKey = HexCoordinateService.toString(currentMapCoordinate)
        if (
            hasSearchResultInCache({
                searchResultsCache,
                type: SearchResultsCacheType.SQUADDIE_ALL_MOVEMENT,
                primaryKey: battleSquaddieId,
                secondaryKey,
            })
        ) {
            return findSearchResultInCache({
                searchResultsCache,
                type: SearchResultsCacheType.SQUADDIE_ALL_MOVEMENT,
                primaryKey: battleSquaddieId,
                secondaryKey,
            })
        }
        const searchResult =
            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate({
                missionMap,
                originMapCoordinate,
                currentMapCoordinate,
                searchLimit,
                objectRepository,
            })
        storeSearchResultsInCache({
            searchResultsCache,
            type: SearchResultsCacheType.SQUADDIE_ALL_MOVEMENT,
            primaryKey: battleSquaddieId,
            secondaryKey: HexCoordinateService.toString(currentMapCoordinate),
            searchResult,
        })
        return searchResult
    },
    hasSquaddieAllMovement: ({
        searchResultsCache,
        battleSquaddieId,
        currentMapCoordinate,
    }: {
        searchResultsCache: SearchResultsCache
        battleSquaddieId: string
        currentMapCoordinate?: HexCoordinate
    }): boolean => {
        return hasSearchResultInCache({
            searchResultsCache,
            type: SearchResultsCacheType.SQUADDIE_ALL_MOVEMENT,
            primaryKey: battleSquaddieId,
            secondaryKey: currentMapCoordinate
                ? HexCoordinateService.toString(currentMapCoordinate)
                : undefined,
        })
    },
    getSquaddieAllMovement: ({
        searchResultsCache,
        battleSquaddieId,
        currentMapCoordinate,
    }: {
        searchResultsCache: SearchResultsCache
        battleSquaddieId: string
        currentMapCoordinate?: HexCoordinate
    }): SearchResult | undefined => {
        return findSearchResultInCache({
            searchResultsCache,
            type: SearchResultsCacheType.SQUADDIE_ALL_MOVEMENT,
            primaryKey: battleSquaddieId,
            secondaryKey: currentMapCoordinate
                ? HexCoordinateService.toString(currentMapCoordinate)
                : undefined,
        })
    },
    invalidateSquaddieAllMovementCache: ({
        searchResultsCache,
        battleSquaddieId,
    }: {
        searchResultsCache: SearchResultsCache
        battleSquaddieId: string
    }) => {
        delete searchResultsCache.squaddieAllMovement[battleSquaddieId]
    },
    invalidateSquaddieAllMovementCacheForAll: ({
        searchResultsCache,
    }: {
        searchResultsCache: SearchResultsCache
    }) => {
        searchResultsCache.squaddieAllMovement = {}
    },
}

const storeSearchResultsInCache = ({
    searchResultsCache,
    primaryKey,
    secondaryKey,
    searchResult,
}: {
    searchResultsCache: SearchResultsCache
    type: SearchResultsCacheType
    primaryKey: string
    secondaryKey: string
    searchResult: SearchResult
}) => {
    searchResultsCache.squaddieAllMovement ||= {}
    searchResultsCache.squaddieAllMovement[primaryKey] = {
        [secondaryKey]: searchResult,
    }
}

const hasSearchResultInCache = ({
    searchResultsCache,
    primaryKey,
    secondaryKey,
}: {
    searchResultsCache: SearchResultsCache
    type: SearchResultsCacheType
    primaryKey: string
    secondaryKey?: string
}): boolean => {
    if (searchResultsCache == undefined) return false

    if (!Object.hasOwn(searchResultsCache?.squaddieAllMovement, primaryKey))
        return false

    if (!secondaryKey) return true

    return Object.hasOwn(
        searchResultsCache?.squaddieAllMovement[primaryKey],
        secondaryKey
    )
}

const findSearchResultInCache = ({
    searchResultsCache,
    type,
    primaryKey,
    secondaryKey,
}: {
    searchResultsCache: SearchResultsCache
    type: SearchResultsCacheType
    primaryKey: string
    secondaryKey?: string
}): SearchResult | undefined => {
    if (
        !hasSearchResultInCache({
            searchResultsCache,
            type,
            primaryKey,
            secondaryKey,
        })
    ) {
        return undefined
    }

    const primaryKeySearchResults = Object.values(
        searchResultsCache.squaddieAllMovement[primaryKey]
    )

    if (!secondaryKey) {
        return primaryKeySearchResults.length > 0
            ? primaryKeySearchResults[0]
            : undefined
    }

    return searchResultsCache.squaddieAllMovement[primaryKey][secondaryKey]
}
