import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { TerrainTileMapService } from "../../terrainTileMap"
import { NextNodeIsNotInTheOpenList } from "./nextNodeIsNotInTheOpenList"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

describe("AddPathConditionNotInMapLayer", () => {
    describe("deprecated SearchPath", () => {
        it("knows when a path has not been enqueued yet", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: mapLayer,
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
        it("knows when a path has been enqueued", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })
            mapLayer.valueByCoordinate[1][0] = true

            const condition = new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: mapLayer,
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
            ).toBe(false)
        })
        it("returns undefined if the path is out of bounds", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: mapLayer,
            })

            const pathAtHead = SearchPathService.newSearchPath()
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 2, r: -1 }, cumulativeMovementCost: 0 },
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
            ).toBeUndefined()
        })
        it("returns undefined if there is no path", () => {
            const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
                }),
                initialValue: false,
            })

            const condition = new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: mapLayer,
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

    it("knows when a path has not been enqueued yet", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsNotInTheOpenList({
            enqueuedMapLayer: mapLayer,
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
    it("knows when a path has been enqueued", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })
        mapLayer.valueByCoordinate[1][0] = true

        const condition = new NextNodeIsNotInTheOpenList({
            enqueuedMapLayer: mapLayer,
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
        ).toBe(false)
    })
    it("returns undefined if the path is out of bounds", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsNotInTheOpenList({
            enqueuedMapLayer: mapLayer,
        })

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 2, r: -1 },
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
        ).toBeUndefined()
    })
    it("returns undefined if there is no path", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new NextNodeIsNotInTheOpenList({
            enqueuedMapLayer: mapLayer,
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
