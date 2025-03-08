import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { NextNodeIsAWallAndSearchCannotPassWalls } from "./nextNodeIsAWallAndSearchCannotPassWalls"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

describe("addPathConditionPathLeadsToWall", () => {
    describe("deprecatedSearchPath", () => {
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

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
                missionMap,
            })
            expect(
                condition.shouldContinue({
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

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
                missionMap,
            })
            expect(
                condition.shouldContinue({
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
                pathContinueConstraints: {
                    canPassThroughWalls: true,
                },
                goal: {},
            })

            const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
                missionMap,
            })
            expect(
                condition.shouldContinue({
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

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
                missionMap,
            })
            expect(
                condition.shouldContinue({
                    newPath: SearchPathService.newSearchPath(),
                    searchParameters,
                })
            ).toBeUndefined()
        })
    })
    it("returns true if the path is not on a wall", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 0, r: 1 },
                cost: 1,
            },
        ]

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
            missionMap,
        })
        expect(
            condition.shouldContinue({
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

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 1, r: 0 },
                cost: 1,
            },
            {
                fromNode: { q: 1, r: 0 },
                toNode: { q: 1, r: 1 },
                cost: 1,
            },
        ]

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
            missionMap,
        })
        expect(
            condition.shouldContinue({
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

        const pathAtHead: SearchConnection<HexCoordinate>[] = [
            {
                fromNode: { q: 0, r: 0 },
                toNode: { q: 1, r: 0 },
                cost: 1,
            },
            {
                fromNode: { q: 1, r: 0 },
                toNode: { q: 1, r: 1 },
                cost: 1,
            },
        ]

        const searchParameters = SearchParametersService.new({
            pathContinueConstraints: {
                canPassThroughWalls: true,
            },
            goal: {},
        })

        const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
            missionMap,
        })
        expect(
            condition.shouldContinue({
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

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeIsAWallAndSearchCannotPassWalls({
            missionMap,
        })
        expect(
            condition.shouldContinue({
                newPath: [],
                searchParameters,
            })
        ).toBeUndefined()
    })
})
