import { SearchResultsCache } from "../../../hexMap/pathfinder/searchResults/searchResultsCache"
import {
    ActionValidityByIdCache,
    ActionValidityByIdCacheService,
} from "../../actionValidity/cache/actionValidityByIdCache"

export type BattleCache = {
    searchResultsCache: SearchResultsCache
    actionValidity: ActionValidityByIdCache
}

export const BattleCacheService = {
    resetActionValidity: (cache: BattleCache) => {
        if (cache == undefined) {
            throw new Error(
                "[BattleCacheService.resetActionValidity] cache must not be undefined"
            )
        }
        cache.actionValidity = ActionValidityByIdCacheService.new()
    },
}
