import { expect } from "vitest"
import { HexCoordinate } from "../../../hexCoordinate/hexCoordinate"
import { SearchResult } from "../../searchResults/searchResult"
import { SearchResultAdapterService } from "../../searchResults/searchResultAdapter"
import { SearchPathAdapterService } from "../../../../search/searchPathAdapter/searchPathAdapter"
import { MissionMapService } from "../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../terrainTileMap"

export const MapSearchTestUtils = {
    create1row6columnsWithAlternatingRoughTerrain: () =>
        MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 2 1 2 1 2 "],
            }),
        }),
    create1row5columnsWithPitAndWall: () =>
        MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 - 1 x 1 "],
            }),
        }),
    create1row5columnsAllFlatTerrain: () =>
        MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 "],
            }),
        }),
    expectPathExistsWithExpectedDistanceAndCost: ({
        mapCoordinate,
        numberOfCoordinates,
        expectedTotalMovementCost,
        searchResults,
    }: {
        mapCoordinate: HexCoordinate
        numberOfCoordinates: number
        expectedTotalMovementCost: number
        searchResults: SearchResult
    }): boolean => {
        const path = SearchResultAdapterService.getShortestPathToCoordinate({
            searchResults: searchResults,
            mapCoordinate,
        })
        expect(SearchPathAdapterService.getTotalMovementCost(path!)).toEqual(
            expectedTotalMovementCost
        )
        expect(SearchPathAdapterService.getNumberOfCoordinates(path)).toEqual(
            numberOfCoordinates + 1
        )
        return true
    },
    expectPathExists: ({
        mapCoordinate,
        searchResults,
    }: {
        mapCoordinate: HexCoordinate
        searchResults: SearchResult
    }): boolean => {
        expect(
            SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults: searchResults,
                mapCoordinate,
            })
        ).toBeTruthy()
        return true
    },
    expectPathDoesNotExist: ({
        mapCoordinate,
        searchResults,
    }: {
        mapCoordinate: HexCoordinate
        searchResults: SearchResult
    }): boolean => {
        expect(
            SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults: searchResults,
                mapCoordinate,
            })
        ).toBeUndefined()
        return true
    },
}
