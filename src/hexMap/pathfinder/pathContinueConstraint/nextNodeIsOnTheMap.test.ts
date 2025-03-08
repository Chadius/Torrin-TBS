import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { TerrainTileMapService } from "../../terrainTileMap"
import { NextNodeIsOnTheMap } from "./nextNodeIsOnTheMap"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

describe("AddPathConditionIsInsideMap", () => {
    describe("Deprecated SearchPath", () => {
        it("knows when a path is inside the map boundary", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsOnTheMap({
                terrainMapLayer: mapLayer,
            })

            const pathAtHead = SearchPathService.newSearchPath()
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
                0
            )

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("knows when a path is out of bounds", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsOnTheMap({
                terrainMapLayer: mapLayer,
            })

            const pathAtHead = SearchPathService.newSearchPath()
            SearchPathService.add(
                pathAtHead,
                {
                    hexCoordinate: { q: 9001, r: -5 },
                    cumulativeMovementCost: 0,
                },
                0
            )

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(false)
        })

        it("returns undefined if there is no path", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsOnTheMap({
                terrainMapLayer: mapLayer,
            })

            const pathAtHead = SearchPathService.newSearchPath()

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBeUndefined()
        })
    })
    it("knows when a path is inside the map boundary", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsOnTheMap({
            terrainMapLayer: mapLayer,
        })

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 1, r: 0 },
                cost: 0,
            },
        ]

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("knows when a path is out of bounds", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsOnTheMap({
            terrainMapLayer: mapLayer,
        })

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 9001, r: -5 },
                cost: 0,
            },
        ]

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("returns undefined if there is no path", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsOnTheMap({
            terrainMapLayer: mapLayer,
        })

        const pathAtHead: SearchConnection<HexCoordinate>[] = []

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
