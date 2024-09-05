import { SearchParametersService } from "../searchParams"
import { SearchPathService } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { AddPathConditionPathLeadsToWall } from "./addPathConditionPathLeadsToWall"

describe("addPathConditionPathLeadsToWall", () => {
    it("returns true if the path is not on a wall", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersService.new({})

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
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersService.new({})

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
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
            1
        )

        const searchParameters = SearchParametersService.new({
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
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const searchParameters = SearchParametersService.new({})

        const condition = new AddPathConditionPathLeadsToWall({ missionMap })
        expect(
            condition.shouldAddNewPath({
                newPath: SearchPathService.newSearchPath(),
                searchParameters,
            })
        ).toBeUndefined()
    })
})
