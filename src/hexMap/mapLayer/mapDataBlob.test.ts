import { describe, beforeEach, it, expect } from "vitest"
import { TerrainTileMap, TerrainTileMapService } from "../terrainTileMap"
import { MapDataBlob } from "./mapDataBlob"

describe("Map Data Blob", () => {
    let map: TerrainTileMap
    let mapDatBlob: MapDataBlob
    beforeEach(() => {
        map = TerrainTileMapService.new({
            movementCost: ["1 1 1 ", " 1 1 1 "],
        })

        mapDatBlob = new MapDataBlob(map)
    })
    it("will add data to locations on the map", () => {
        mapDatBlob.add<number>({ q: 0, r: 2 }, 9001)
        expect(mapDatBlob.get<number>({ q: 0, r: 2 })).toEqual(9001)
    })
    it("will not add data to locations off map", () => {
        mapDatBlob.add<string>(
            { q: -10, r: 500 },
            "offmap coordinates should always return undefined"
        )
        expect(mapDatBlob.get<string>({ q: -10, r: 500 })).toBeUndefined()
    })
    it("data will be undefined by default", () => {
        expect(mapDatBlob.get<number>({ q: 0, r: 2 })).toBeUndefined()
    })
})
