import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../terrainTileMap"
import { NextNodeIsAPitAndSearchCannotCrossPits } from "./nextNodeIsAPitAndSearchCannotCrossPits"
import { describe, expect, it } from "vitest"
import { SearchConnection } from "../../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"

describe("addPathConditionPathLeadsToPit", () => {
    describe("deprecatedSearchPath", () => {
        it("returns true if the path is not on a Pit", () => {
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

            const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
                missionMap,
            })
            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(true)
        })

        it("returns false if the path is in a Pit and search cannot cross pits", () => {
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
                { hexCoordinate: { q: 0, r: 1 }, cumulativeMovementCost: 0 },
                1
            )
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 0, r: 2 }, cumulativeMovementCost: 0 },
                1
            )
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 0 },
                1
            )

            const searchParameters = SearchParametersService.new({
                goal: {},
            })

            const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
                missionMap,
            })
            expect(
                condition.shouldContinue({
                    newPath: pathAtHead,
                    searchParameters,
                })
            ).toBe(false)
        })

        it("returns true if the path is in a Pit and search can cross pits", () => {
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
                { hexCoordinate: { q: 0, r: 1 }, cumulativeMovementCost: 0 },
                1
            )
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 0, r: 2 }, cumulativeMovementCost: 0 },
                1
            )
            SearchPathService.add(
                pathAtHead,
                { hexCoordinate: { q: 1, r: 2 }, cumulativeMovementCost: 0 },
                1
            )

            const searchParameters = SearchParametersService.new({
                pathContinueConstraints: {
                    canPassOverPits: true,
                },
                goal: {},
            })

            const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
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

            const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
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

    it("returns true if the path is not on a Pit", () => {
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
        ]

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
            missionMap,
        })
        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })

    it("returns false if the path is in a Pit and search cannot cross pits", () => {
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
            {
                fromNode: { q: 0, r: 1 },
                toNode: { q: 0, r: 2 },
                cost: 1,
            },
            {
                fromNode: { q: 0, r: 2 },
                toNode: { q: 1, r: 2 },
                cost: 1,
            },
        ]
        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
            missionMap,
        })
        expect(
            condition.shouldContinue({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })

    it("returns true if the path is in a Pit and search can cross pits", () => {
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
            {
                fromNode: { q: 0, r: 1 },
                toNode: { q: 0, r: 2 },
                cost: 1,
            },
            {
                fromNode: { q: 0, r: 2 },
                toNode: { q: 1, r: 2 },
                cost: 1,
            },
        ]

        const searchParameters = SearchParametersService.new({
            pathContinueConstraints: {
                canPassOverPits: true,
            },
            goal: {},
        })

        const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
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

        const condition = new NextNodeIsAPitAndSearchCannotCrossPits({
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
