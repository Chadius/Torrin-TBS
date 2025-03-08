import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { SearchParameters, SearchParametersService } from "../searchParameters"
import { SearchPath } from "../searchPath"
import {
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { PathfinderService } from "./pathfinder"
import { ObjectRepositoryService } from "../../../battle/objectRepository"
import { beforeEach, describe, expect, it } from "vitest"
import { SearchPathAdapterService } from "../../../search/searchPathAdapter/searchPathAdapter"

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

        it("path to the starting coordinate costs no movement", () => {
            const path2_0: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 0,
                        r: 2,
                    }
                )
            expect(
                SearchPathAdapterService.getTotalMovementCost(path2_0)
            ).toEqual(0)
            expect(
                SearchPathAdapterService.getCoordinates(path2_0)
            ).toHaveLength(1)
            expect(SearchPathAdapterService.getTotalDistance(path2_0)).toEqual(
                0
            )
        })

        it("path to further coordinates costs movement", () => {
            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 1,
                        r: 4,
                    }
                )
            expect(
                SearchPathAdapterService.getTotalMovementCost(path1_4)
            ).toEqual(4)
            expect(
                SearchPathAdapterService.getCoordinates(path1_4)
            ).toHaveLength(4)
            expect(SearchPathAdapterService.getTotalDistance(path1_4)).toEqual(
                3
            )
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
                    {
                        q: 0,
                        r: 0,
                    }
                )
            expect(
                SearchPathAdapterService.getTotalMovementCost(path0_0)
            ).toEqual(0)
            expect(
                SearchPathAdapterService.getCoordinates(path0_0)
            ).toHaveLength(1)
            expect(SearchPathAdapterService.getTotalDistance(path0_0)).toEqual(
                0
            )

            const path1_4: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 1,
                        r: 4,
                    }
                )
            expect(
                SearchPathAdapterService.getTotalMovementCost(path1_4)
            ).toEqual(0)
            expect(
                SearchPathAdapterService.getCoordinates(path1_4)
            ).toHaveLength(1)
            expect(SearchPathAdapterService.getTotalDistance(path1_4)).toEqual(
                0
            )
        })

        it("path to further coordinates refers to starting coordinate with least movement cost", () => {
            const path0_2: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 0,
                        r: 2,
                    }
                )

            const route0_2 = SearchPathAdapterService.getCoordinates(path0_2)
            expect(route0_2).toHaveLength(3)
            expect(route0_2[0].hexCoordinate).toEqual({ q: 0, r: 0 })
            expect(route0_2[1].hexCoordinate).toEqual({ q: 0, r: 1 })
            expect(route0_2[2].hexCoordinate).toEqual({ q: 0, r: 2 })

            expect(
                SearchPathAdapterService.getTotalMovementCost(path0_2)
            ).toEqual(3)
            expect(SearchPathAdapterService.getTotalDistance(path0_2)).toEqual(
                2
            )

            const path1_3: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 1,
                        r: 3,
                    }
                )

            const route1_3 = SearchPathAdapterService.getCoordinates(path1_3)
            expect(route1_3).toHaveLength(2)
            expect(route1_3[0].hexCoordinate).toEqual({ q: 1, r: 4 })
            expect(route1_3[1].hexCoordinate).toEqual({ q: 1, r: 3 })

            expect(
                SearchPathAdapterService.getTotalMovementCost(path1_3)
            ).toEqual(2)
            expect(SearchPathAdapterService.getTotalDistance(path1_3)).toEqual(
                1
            )
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
