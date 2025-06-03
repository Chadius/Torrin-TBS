import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { MapSearchService } from "../pathGeneration/mapSearch"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { MapSearchTestUtils } from "../pathGeneration/mapSearchTests/mapSearchTestUtils"
import {
    SearchResultsCache,
    SearchResultsCacheService,
} from "./searchResultsCache"
import { SearchLimitService } from "../pathGeneration/searchLimit"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

describe("Search Results Cache", () => {
    let objectRepository: ObjectRepository
    let calculateAllPathsSpy: MockInstance
    let missionMap: MissionMap
    let searchResultsCache: SearchResultsCache
    let originMapCoordinate: HexCoordinate
    let battleSquaddieId = "battleSquaddieId"
    let battleSquaddieId2 = "battleSquaddieId2"

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: battleSquaddieId,
            battleId: battleSquaddieId,
            templateId: battleSquaddieId,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [],
            objectRepository,
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: battleSquaddieId2,
            battleId: battleSquaddieId2,
            templateId: battleSquaddieId2,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [],
            objectRepository,
        })

        missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        originMapCoordinate = { q: 0, r: 0 }
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId,
            squaddieTemplateId: battleSquaddieId,
            originMapCoordinate,
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: battleSquaddieId2,
            squaddieTemplateId: battleSquaddieId2,
            originMapCoordinate: { q: 0, r: 4 },
        })

        calculateAllPathsSpy = vi.spyOn(
            MapSearchService,
            "calculateAllPossiblePathsFromStartingCoordinate"
        )

        searchResultsCache = SearchResultsCacheService.new({
            missionMap,
            objectRepository,
        })
    })

    afterEach(() => {
        if (calculateAllPathsSpy) calculateAllPathsSpy.mockRestore()
    })

    describe("calculating all paths for a single squaddie", () => {
        it("will use pathfinding when searching when requested the first time", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(calculateAllPathsSpy).toHaveBeenCalledWith({
                missionMap,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
                objectRepository,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })
            ).toBe(true)

            let battleSquaddieAllPossibleLocations =
                SearchResultsCacheService.getSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })

            expect(battleSquaddieAllPossibleLocations).not.toBeUndefined()
        })
        it("will use the cached results for the same battle squaddie and location", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(calculateAllPathsSpy).toHaveBeenCalledOnce()

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(calculateAllPathsSpy).toHaveBeenCalledOnce()
        })
        it("will not use the cached results for the same battle squaddie if the location is different", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(calculateAllPathsSpy).toHaveBeenCalledOnce()

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 0 },
                searchLimit,
            })

            expect(calculateAllPathsSpy).toHaveBeenCalledTimes(2)
        })
        it("can invalidate cache for a given squaddie", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })
            ).toBe(true)

            SearchResultsCacheService.invalidateSquaddieAllMovementCache({
                searchResultsCache,
                battleSquaddieId,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })
            ).toBe(false)
        })
        it("can invalidate cache for all squaddies", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })
            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId: battleSquaddieId2,
                originMapCoordinate: { q: 0, r: 4 },
                currentMapCoordinate: { q: 0, r: 4 },
                searchLimit,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })
            ).toBe(true)
            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId: battleSquaddieId2,
                })
            ).toBe(true)

            SearchResultsCacheService.invalidateSquaddieAllMovementCacheForAll({
                searchResultsCache,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                })
            ).toBe(false)
            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId: battleSquaddieId2,
                })
            ).toBe(false)
        })
        it("can specify a coordinate to search for", () => {
            const searchLimit = SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                maximumMovementCost: 3,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            })

            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate: { q: 0, r: 1 },
                searchLimit,
            })

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                    currentMapCoordinate: { q: 0, r: 1 },
                })
            ).toBe(true)
            expect(
                SearchResultsCacheService.getSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                    currentMapCoordinate: { q: 0, r: 1 },
                })
            ).not.toBeUndefined()

            expect(
                SearchResultsCacheService.hasSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                    currentMapCoordinate: { q: 0, r: 0 },
                })
            ).toBe(false)
            expect(
                SearchResultsCacheService.getSquaddieAllMovement({
                    searchResultsCache,
                    battleSquaddieId,
                    currentMapCoordinate: { q: 0, r: 0 },
                })
            ).toBeUndefined()
        })
    })
})
