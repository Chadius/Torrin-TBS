import { MissionMap, MissionMapService } from "./missionMap"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "./mapSearchDataLayer"
import { describe, expect, it } from "vitest"

describe("MapSearchDataLayer", () => {
    it("can generate a layer based on a given map and initial value", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const mapLayerFilledWithFalse: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: false,
            })

        expect(mapLayerFilledWithFalse.widthOfWidestRow).toBe(5)
        expect(mapLayerFilledWithFalse.numberOfRows).toBe(2)
        ;[0, 1, 2, 3, 4].forEach((r) => {
            ;[0, 1].forEach((q) => {
                expect(mapLayerFilledWithFalse.valueByLocation[q][r]).toBe(
                    false
                )
            })
        })
    })

    it("can generate a layer based on a given map and value filling function", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const initialValueFill = (q: number, r: number): boolean | number => {
            return q + r
        }

        const mapLayerFilledWithSumOfCoordinates: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: initialValueFill,
            })

        expect(mapLayerFilledWithSumOfCoordinates.widthOfWidestRow).toBe(5)
        expect(mapLayerFilledWithSumOfCoordinates.numberOfRows).toBe(2)
        ;[0, 1, 2, 3, 4].forEach((r) => {
            ;[0, 1].forEach((q) => {
                expect(
                    mapLayerFilledWithSumOfCoordinates.valueByLocation[q][r]
                ).toBe(q + r)
            })
        })
    })

    it("can generate a layer based on a given map and use undefined if given", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })

        const mapLayerFilledWithUndefined: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: undefined,
            })

        expect(mapLayerFilledWithUndefined.widthOfWidestRow).toBe(5)
        expect(mapLayerFilledWithUndefined.numberOfRows).toBe(2)
        ;[0, 1, 2, 3, 4].forEach((r) => {
            ;[0, 1].forEach((q) => {
                expect(mapLayerFilledWithUndefined.valueByLocation[q][r]).toBe(
                    undefined
                )
            })
        })
    })

    it("can set the value of an individual tile on the layer", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })
        const mapLayerFilledWithFalse: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: false,
            })
        MapSearchDataLayerService.setValueOfLocation({
            mapLayer: mapLayerFilledWithFalse,
            q: 1,
            r: 2,
            value: true,
        })
        expect(mapLayerFilledWithFalse.valueByLocation[1][2]).toBe(true)
    })

    it("throws an error if setting a location that is out of bounds", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })
        const mapLayerFilledWithFalse: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: false,
            })

        const shouldThrowError = () => {
            MapSearchDataLayerService.setValueOfLocation({
                mapLayer: mapLayerFilledWithFalse,
                q: 9001,
                r: -3,
                value: true,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow("out of bounds")
    })

    it("knows when a location is out of bounds", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 2 1 2 ", " 1 x - 2 1 "],
            }),
        })
        const mapLayerFilledWithFalse: MapSearchDataLayer =
            MapSearchDataLayerService.new({
                map: missionMap,
                initialValue: false,
            })
        ;[0, 1, 2, 3, 4].forEach((r) => {
            ;[0, 1].forEach((q) => {
                expect(
                    MapSearchDataLayerService.outOfBounds({
                        mapLayer: mapLayerFilledWithFalse,
                        q,
                        r,
                    })
                ).toBe(false)
            })
        })
        expect(
            MapSearchDataLayerService.outOfBounds({
                mapLayer: mapLayerFilledWithFalse,
                q: -1,
                r: 0,
            })
        ).toBe(true)
        expect(
            MapSearchDataLayerService.outOfBounds({
                mapLayer: mapLayerFilledWithFalse,
                q: -1,
                r: mapLayerFilledWithFalse.widthOfWidestRow,
            })
        ).toBe(true)
        expect(
            MapSearchDataLayerService.outOfBounds({
                mapLayer: mapLayerFilledWithFalse,
                q: 0,
                r: -1,
            })
        ).toBe(true)
        expect(
            MapSearchDataLayerService.outOfBounds({
                mapLayer: mapLayerFilledWithFalse,
                q: mapLayerFilledWithFalse.numberOfRows,
                r: 0,
            })
        ).toBe(true)
    })
})
