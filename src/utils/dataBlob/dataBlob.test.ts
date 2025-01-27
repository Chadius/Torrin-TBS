import { describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "./dataBlob"

describe("DataBlob", () => {
    it("Can store and retrieve data based on a key", () => {
        const dataBlob: DataBlob = DataBlobService.new()
        DataBlobService.add<number>(dataBlob, "testKey", 9001)
        expect(DataBlobService.get<number>(dataBlob, "testKey")).toEqual(9001)
    })
})
