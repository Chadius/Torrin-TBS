import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { SearchParameters, SearchParametersHelper } from "../searchParams"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import { SearchPath, SearchPathService } from "../searchPath"
import {
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { PathfinderHelper } from "./pathfinder"
import { ObjectRepositoryService } from "../../../battle/objectRepository"

describe("Pathfinder", () => {
    describe("generate shortest paths for every location in a given map", () => {
        let missionMap: MissionMap
        let searchParameters: SearchParameters
        let searchResults: SearchResult

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })

            searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 2 }],
            })

            searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })
        })

        it("marks all locations as reachable that are not walls or pits", () => {
            ;[0, 1, 2, 3, 4].forEach((r) => {
                ;[0, 1].forEach((q) => {
                    const reachable: boolean =
                        [
                            HexGridMovementCost.pit,
                            HexGridMovementCost.wall,
                        ].includes(
                            TerrainTileMapService.getTileTerrainTypeAtLocation(
                                missionMap.terrainTileMap,
                                { q, r }
                            )
                        ) !== true
                    expect(
                        SearchResultsService.isLocationReachable(
                            searchResults,
                            q,
                            r
                        )
                    ).toBe(reachable)
                })
            })
        })

        it("path to the starting location costs no movement", () => {
            const path2_0: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    0,
                    2
                )
            expect(SearchPathService.getTotalMovementCost(path2_0)).toEqual(0)
            expect(SearchPathService.getLocations(path2_0)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path2_0)).toEqual(0)
        })

        it("path to further locations costs movement", () => {
            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    1,
                    4
                )
            expect(SearchPathService.getTotalMovementCost(path1_4)).toEqual(4)
            expect(SearchPathService.getLocations(path1_4)).toHaveLength(4)
            expect(SearchPathService.getTotalDistance(path1_4)).toEqual(3)
        })
    })

    it("throws an error when no start location is given", () => {
        const shouldThrowError = () => {
            PathfinderHelper.search({
                searchParameters: SearchParametersHelper.new({}),
                missionMap: MissionMapService.default(),
                repository: ObjectRepositoryService.new(),
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow("no start location")
    })

    describe("distance limits and terrain movement costs", () => {
        it("can use movementPerAction and numberOfActions to determine distance", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                movementPerAction: 3,
                numberOfActions: 2,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 4)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 5)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 6)
            ).toBeTruthy()

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 7)
            ).toBeFalsy()
        })
        it("can factor terrain movement costs", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 2 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                movementPerAction: 3,
                numberOfActions: 2,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 4)
            ).toBeFalsy()
        })
        it("can ignores terrain movement costs if ignoreTerrainCosts is true", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 2 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                movementPerAction: 3,
                numberOfActions: 2,
                ignoreTerrainCost: true,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 4)
            ).toBeTruthy()
        })
    })

    describe("wall and sky tiles", () => {
        it("cannot pass wall tiles", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 x 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeFalsy()
        })
        it("cannot pass over pit tiles", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                canPassOverPits: false,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeFalsy()
        })
        it("can pass over pit tiles if search parameters is set but still cannot stop on them", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                canPassOverPits: true,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeTruthy()
        })
        it("can pass over wall tiles if search parameters is set but still cannot stop on them", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 x 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                canPassThroughWalls: true,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBeTruthy()
        })
    })

    describe("Split movement by number of actions", () => {
        it("will count number of actions based on the movement per action", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 1 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                movementPerAction: 2,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    0
                )
            ).toBe(0)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    1
                )
            ).toBe(1)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    2
                )
            ).toBe(2)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    3
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    4
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    5
                )
            ).toBe(4)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    6
                )
            ).toBe(4)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    7
                )
            ).toBe(5)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    8
                )
            ).toBe(5)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    9
                )
            ).toBe(6)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    10
                )
            ).toBe(6)
        })
        it("will count number of actions based on the movement needed up to the number of actions", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 1 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                numberOfActions: 3,
                movementPerAction: 2,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    0
                )
            ).toBe(0)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    1
                )
            ).toBe(1)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    2
                )
            ).toBe(2)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    3
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    4
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    5
                )
            ).toBe(undefined)
        })
        it("will always assume 1 action needed if movement per action is not specified", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 1 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachLocation(
                    searchResults,
                    0,
                    0
                )
            ).toBe(0)
            for (
                let r = 1;
                r <
                TerrainTileMapService.getDimensions(missionMap.terrainTileMap)
                    .widthOfWidestRow;
                r++
            ) {
                expect(
                    SearchResultsService.numberOfActionsToReachLocation(
                        searchResults,
                        0,
                        r
                    )
                ).toBe(1)
            }
        })
    })

    describe("minimum and maximum distances", () => {
        it("will not include anything past the maximum distance", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["2 2 2 2 2 2 2 2 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                maximumDistanceMoved: 3,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 4)
            ).toBe(false)
        })
        it("will not include any paths less than the minimum distance", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["2 2 2 2 2 2 2 2 "],
                }),
            })

            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                minimumDistanceMoved: 3,
            })

            const searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 0)
            ).toBe(false)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 1)
            ).toBe(false)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 2)
            ).toBe(false)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 3)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 4)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 6)
            ).toBe(true)
            expect(
                SearchResultsService.isLocationReachable(searchResults, 0, 7)
            ).toBe(true)
        })
    })

    describe("multiple start locations", () => {
        let missionMap: MissionMap
        let searchParameters: SearchParameters
        let searchResults: SearchResult

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })

            searchParameters = SearchParametersHelper.new({
                startLocations: [
                    { q: 0, r: 0 },
                    { q: 1, r: 4 },
                ],
            })

            searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })
        })

        it("path to the starting location costs no movement", () => {
            const path0_0: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    0,
                    0
                )
            expect(SearchPathService.getTotalMovementCost(path0_0)).toEqual(0)
            expect(SearchPathService.getLocations(path0_0)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path0_0)).toEqual(0)

            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    1,
                    4
                )
            expect(SearchPathService.getTotalMovementCost(path1_4)).toEqual(0)
            expect(SearchPathService.getLocations(path1_4)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path1_4)).toEqual(0)
        })

        it("path to further locations refers to starting location with least movement cost", () => {
            const path0_2: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    0,
                    2
                )

            const route0_2 = SearchPathService.getLocations(path0_2)
            expect(route0_2).toHaveLength(3)
            expect(route0_2[0].hexCoordinate).toEqual({ q: 0, r: 0 })
            expect(route0_2[1].hexCoordinate).toEqual({ q: 0, r: 1 })
            expect(route0_2[2].hexCoordinate).toEqual({ q: 0, r: 2 })

            expect(SearchPathService.getTotalMovementCost(path0_2)).toEqual(3)
            expect(SearchPathService.getTotalDistance(path0_2)).toEqual(2)

            const path1_3: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    1,
                    3
                )

            const route1_3 = SearchPathService.getLocations(path1_3)
            expect(route1_3).toHaveLength(2)
            expect(route1_3[0].hexCoordinate).toEqual({ q: 1, r: 4 })
            expect(route1_3[1].hexCoordinate).toEqual({ q: 1, r: 3 })

            expect(SearchPathService.getTotalMovementCost(path1_3)).toEqual(2)
            expect(SearchPathService.getTotalDistance(path1_3)).toEqual(1)
        })

        it("can use minimum and maximum distance to generate a spreading effect", () => {
            searchParameters = SearchParametersHelper.new({
                startLocations: [
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                ],
                minimumDistanceMoved: 1,
                maximumDistanceMoved: 2,
                canPassOverPits: true,
            })

            searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(searchResults.shortestPathByLocation[0][0]).toBeTruthy()
            expect(searchResults.shortestPathByLocation[0][1]).toBeFalsy()
            expect(searchResults.shortestPathByLocation[0][2]).toBeFalsy()
            expect(searchResults.shortestPathByLocation[0][3]).toBeTruthy()
            expect(searchResults.shortestPathByLocation[0][4]).toBeTruthy()

            expect(searchResults.shortestPathByLocation[1][0]).toBeTruthy()
            expect(searchResults.shortestPathByLocation[1][1]).toBeFalsy()
            expect(searchResults.shortestPathByLocation[1][2]).toBeFalsy()
            expect(searchResults.shortestPathByLocation[1][3]).toBeTruthy()
            expect(searchResults.shortestPathByLocation[1][4]).toBeFalsy()
        })
    })

    describe("stop locations", () => {
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })
        })

        it("will acknowledge that the search ended when it reached all stop locations", () => {
            const searchParameters = SearchParametersHelper.new({
                startLocations: [{ q: 0, r: 0 }],
                stopLocations: [
                    { q: 0, r: 0 },
                    { q: 1, r: 3 },
                    { q: -1, r: 9001 },
                ],
            })

            const searchResults: SearchResult = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryService.new(),
            })

            expect(searchResults.stopLocationsReached).toHaveLength(2)
            expect(searchResults.stopLocationsReached).toContainEqual({
                q: 0,
                r: 0,
            })
            expect(searchResults.stopLocationsReached).toContainEqual({
                q: 1,
                r: 3,
            })
        })
    })
})
