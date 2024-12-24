import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { SearchParameters, SearchParametersService } from "../searchParameters"
import { HexGridMovementCost } from "../../hexGridMovementCost"
import { SearchPath, SearchPathService } from "../searchPath"
import {
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { PathfinderService } from "./pathfinder"
import { ObjectRepositoryService } from "../../../battle/objectRepository"
import { beforeEach, describe, expect, it } from "vitest"

describe("Pathfinder", () => {
    describe("generate shortest paths for every coordinate in a given map", () => {
        let missionMap: MissionMap
        let searchParameters: SearchParameters
        let searchResults: SearchResult

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })

            searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 2 }],
                },
                goal: {},
            })

            searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })
        })

        it("marks all coordinates as reachable that are not walls or pits", () => {
            ;[0, 1, 2, 3, 4].forEach((r) => {
                ;[0, 1].forEach((q) => {
                    const reachable: boolean =
                        [
                            HexGridMovementCost.pit,
                            HexGridMovementCost.wall,
                        ].includes(
                            TerrainTileMapService.getTileTerrainTypeAtCoordinate(
                                missionMap.terrainTileMap,
                                { q, r }
                            )
                        ) !== true
                    expect(
                        SearchResultsService.isCoordinateReachable(
                            searchResults,
                            q,
                            r
                        )
                    ).toBe(reachable)
                })
            })
        })

        it("path to the starting coordinate costs no movement", () => {
            const path2_0: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    0,
                    2
                )
            expect(SearchPathService.getTotalMovementCost(path2_0)).toEqual(0)
            expect(SearchPathService.getCoordinates(path2_0)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path2_0)).toEqual(0)
        })

        it("path to further coordinates costs movement", () => {
            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    1,
                    4
                )
            expect(SearchPathService.getTotalMovementCost(path1_4)).toEqual(4)
            expect(SearchPathService.getCoordinates(path1_4)).toHaveLength(4)
            expect(SearchPathService.getTotalDistance(path1_4)).toEqual(3)
        })
    })

    it("throws an error when no start coordinate is given", () => {
        const shouldThrowError = () => {
            PathfinderService.search({
                searchParameters: SearchParametersService.new({
                    goal: {},
                }),
                missionMap: MissionMapService.default(),
                objectRepository: ObjectRepositoryService.new(),
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow("no start coordinate")
    })

    describe("distance limits and terrain movement costs", () => {
        it("can use movementPerAction and numberOfActions to determine distance", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    movementPerAction: 3,
                    numberOfActions: 2,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 4)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 5)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 6)
            ).toBeTruthy()

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 7)
            ).toBeFalsy()
        })
        it("can factor terrain movement costs", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 2 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    movementPerAction: 3,
                    numberOfActions: 2,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 4)
            ).toBeFalsy()
        })
        it("can ignores terrain movement costs if ignoreTerrainCosts is true", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 2 2 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    movementPerAction: 3,
                    numberOfActions: 2,
                },
                pathContinueConstraints: {
                    ignoreTerrainCost: true,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 4)
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

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeFalsy()
        })
        it("cannot pass over pit tiles", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathContinueConstraints: {
                    canPassOverPits: false,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeFalsy()
        })
        it("can pass over pit tiles if search parameters is set but still cannot stop on them", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathContinueConstraints: {
                    canPassOverPits: true,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBeTruthy()
        })
        it("can pass over wall tiles if search parameters is set but still cannot stop on them", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 x 1 1 1 1 1 1 1 1 1 1 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathContinueConstraints: {
                    canPassThroughWalls: true,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBeTruthy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBeFalsy()
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
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

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    movementPerAction: 2,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    0
                )
            ).toBe(0)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    1
                )
            ).toBe(1)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    2
                )
            ).toBe(2)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    3
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    4
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    5
                )
            ).toBe(4)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    6
                )
            ).toBe(4)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    7
                )
            ).toBe(5)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    8
                )
            ).toBe(5)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    9
                )
            ).toBe(6)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
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

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    numberOfActions: 3,
                    movementPerAction: 2,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    0
                )
            ).toBe(0)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    1
                )
            ).toBe(1)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    2
                )
            ).toBe(2)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    3
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
                    searchResults,
                    0,
                    4
                )
            ).toBe(3)
            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
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

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.numberOfActionsToReachCoordinate(
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
                    SearchResultsService.numberOfActionsToReachCoordinate(
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

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    maximumDistanceMoved: 3,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 4)
            ).toBe(false)
        })
        it("will not include any paths less than the minimum distance", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["2 2 2 2 2 2 2 2 "],
                }),
            })

            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathSizeConstraints: {
                    minimumDistanceMoved: 3,
                },
                goal: {},
            })

            const searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 0)
            ).toBe(false)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 1)
            ).toBe(false)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 2)
            ).toBe(false)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 3)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 4)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 6)
            ).toBe(true)
            expect(
                SearchResultsService.isCoordinateReachable(searchResults, 0, 7)
            ).toBe(true)
        })
    })

    describe("multiple start coordinates", () => {
        let missionMap: MissionMap
        let searchParameters: SearchParameters
        let searchResults: SearchResult

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })

            searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [
                        { q: 0, r: 0 },
                        { q: 1, r: 4 },
                    ],
                },
                goal: {},
            })

            searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })
        })

        it("path to the starting coordinate costs no movement", () => {
            const path0_0: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    0,
                    0
                )
            expect(SearchPathService.getTotalMovementCost(path0_0)).toEqual(0)
            expect(SearchPathService.getCoordinates(path0_0)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path0_0)).toEqual(0)

            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    1,
                    4
                )
            expect(SearchPathService.getTotalMovementCost(path1_4)).toEqual(0)
            expect(SearchPathService.getCoordinates(path1_4)).toHaveLength(1)
            expect(SearchPathService.getTotalDistance(path1_4)).toEqual(0)
        })

        it("path to further coordinates refers to starting coordinate with least movement cost", () => {
            const path0_2: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    0,
                    2
                )

            const route0_2 = SearchPathService.getCoordinates(path0_2)
            expect(route0_2).toHaveLength(3)
            expect(route0_2[0].hexCoordinate).toEqual({ q: 0, r: 0 })
            expect(route0_2[1].hexCoordinate).toEqual({ q: 0, r: 1 })
            expect(route0_2[2].hexCoordinate).toEqual({ q: 0, r: 2 })

            expect(SearchPathService.getTotalMovementCost(path0_2)).toEqual(3)
            expect(SearchPathService.getTotalDistance(path0_2)).toEqual(2)

            const path1_3: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    1,
                    3
                )

            const route1_3 = SearchPathService.getCoordinates(path1_3)
            expect(route1_3).toHaveLength(2)
            expect(route1_3[0].hexCoordinate).toEqual({ q: 1, r: 4 })
            expect(route1_3[1].hexCoordinate).toEqual({ q: 1, r: 3 })

            expect(SearchPathService.getTotalMovementCost(path1_3)).toEqual(2)
            expect(SearchPathService.getTotalDistance(path1_3)).toEqual(1)
        })

        it("can use minimum and maximum distance to generate a spreading effect", () => {
            searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                    ],
                },
                pathSizeConstraints: {
                    minimumDistanceMoved: 1,
                    maximumDistanceMoved: 2,
                },
                pathContinueConstraints: {
                    canPassOverPits: true,
                },
                goal: {},
            })

            searchResults = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(searchResults.shortestPathByCoordinate[0][0]).toBeTruthy()
            expect(searchResults.shortestPathByCoordinate[0][1]).toBeFalsy()
            expect(searchResults.shortestPathByCoordinate[0][2]).toBeFalsy()
            expect(searchResults.shortestPathByCoordinate[0][3]).toBeTruthy()
            expect(searchResults.shortestPathByCoordinate[0][4]).toBeTruthy()

            expect(searchResults.shortestPathByCoordinate[1][0]).toBeTruthy()
            expect(searchResults.shortestPathByCoordinate[1][1]).toBeFalsy()
            expect(searchResults.shortestPathByCoordinate[1][2]).toBeFalsy()
            expect(searchResults.shortestPathByCoordinate[1][3]).toBeTruthy()
            expect(searchResults.shortestPathByCoordinate[1][4]).toBeFalsy()
        })
    })

    describe("stop coordinates", () => {
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
            })
        })

        it("will acknowledge that the search ended when it reached all stop coordinates", () => {
            const searchParameters = SearchParametersService.new({
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                goal: {
                    stopCoordinates: [
                        { q: 0, r: 0 },
                        { q: 1, r: 3 },
                        { q: -1, r: 9001 },
                    ],
                },
            })

            const searchResults: SearchResult = PathfinderService.search({
                searchParameters,
                missionMap,
                objectRepository: ObjectRepositoryService.new(),
            })

            expect(searchResults.stopCoordinatesReached).toHaveLength(2)
            expect(searchResults.stopCoordinatesReached).toContainEqual({
                q: 0,
                r: 0,
            })
            expect(searchResults.stopCoordinatesReached).toContainEqual({
                q: 1,
                r: 3,
            })
        })
    })
})
