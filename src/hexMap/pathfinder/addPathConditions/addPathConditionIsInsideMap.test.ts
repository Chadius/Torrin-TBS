import { SearchParametersHelper } from "../searchParams"
import { SearchPathHelper } from "../searchPath"
import { MapLayer, MapLayerHelper } from "../../../missionMap/mapLayer"
import { TerrainTileMap } from "../../terrainTileMap"
import { AddPathConditionIsInsideMap } from "./addPathConditionIsInsideMap"

describe("AddPathConditionIsInsideMap", () => {
    it("knows when a path is inside the map boundary", () => {
        const mapLayer: MapLayer = MapLayerHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new AddPathConditionIsInsideMap({
            terrainMapLayer: mapLayer,
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

    it("knows when a path is out of bounds", () => {
        const mapLayer: MapLayer = MapLayerHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new AddPathConditionIsInsideMap({
            terrainMapLayer: mapLayer,
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 9001, r: -5 }, cumulativeMovementCost: 0 },
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

    it("returns undefined if there is no path", () => {
        const mapLayer: MapLayer = MapLayerHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
            initialValue: false,
        })

        const condition = new AddPathConditionIsInsideMap({
            terrainMapLayer: mapLayer,
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
