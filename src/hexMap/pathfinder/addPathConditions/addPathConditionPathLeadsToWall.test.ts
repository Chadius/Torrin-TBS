import { SearchParametersHelper } from "../searchParams"
import { SearchPathHelper } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMap } from "../../terrainTileMap"
import { AddPathConditionPathLeadsToWall } from "./addPathConditionPathLeadsToWall"

describe("addPathConditionPathLeadsToWall", () => {
    it("returns true if the path is not on a wall", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersHelper.new({})

        const condition = new AddPathConditionPathLeadsToWall({ missionMap })
        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns false if the path is in a wall", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersHelper.new({})

        const condition = new AddPathConditionPathLeadsToWall({ missionMap })
        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("returns true if the path is in a wall and search can pass through walls", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathHelper.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersHelper.new({
            canPassThroughWalls: true,
        })

        const condition = new AddPathConditionPathLeadsToWall({ missionMap })
        expect(
            condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns undefined if there is no path", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const searchParameters = SearchParametersHelper.new({})

        const condition = new AddPathConditionPathLeadsToWall({ missionMap })
        expect(
            condition.shouldAddNewPath({
                newPath: SearchPathHelper.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})
