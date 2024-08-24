import { SearchParametersHelper } from "../searchParams"
import { SearchPathHelper } from "../searchPath"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { TerrainTileMapService } from "../../terrainTileMap"
import { AddPathConditionNotInMapLayer } from "./addPathConditionNotInMapLayer"

describe("AddPathConditionNotInMapLayer", () => {
    it("knows when a path has not been enqueued yet", () => {
        const mapLayer: MapSearchDataLayer = MapSearchDataLayerService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new AddPathConditionNotInMapLayer({
            enqueuedMapLayer: mapLayer,
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersHelper.new({})

        expect(
            condition.shouldAddNewPath({
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
        mapLayer.valueByLocation[1][0] = true

        const condition = new AddPathConditionNotInMapLayer({
            enqueuedMapLayer: mapLayer,
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersHelper.new({})

        expect(
            condition.shouldAddNewPath({
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

        const condition = new AddPathConditionNotInMapLayer({
            enqueuedMapLayer: mapLayer,
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 2, r: -1 }, cumulativeMovementCost: 0 },
            0
        )

        const searchParameters = SearchParametersHelper.new({})

        expect(
            condition.shouldAddNewPath({
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

        const condition = new AddPathConditionNotInMapLayer({
            enqueuedMapLayer: mapLayer,
        })

        const pathAtHead = SearchPathHelper.newSearchPath()

        const searchParameters = SearchParametersHelper.new({})

        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})
