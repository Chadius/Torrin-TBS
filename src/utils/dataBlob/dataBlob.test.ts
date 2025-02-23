import { describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "./dataBlob"

describe("DataBlob", () => {
    it("Can store and retrieve data based on a key", () => {
        const dataBlob: DataBlob = DataBlobService.new()
        DataBlobService.add<number>(dataBlob, "testKey", 9001)
        expect(DataBlobService.get<number>(dataBlob, "testKey")).toEqual(9001)
    })
    it("Can either get an existing item or create a default value", () => {
        const dataBlob: DataBlob = DataBlobService.new()
        expect(DataBlobService.get<number>(dataBlob, "testKey")).toBeUndefined()

        const createdTestKey = DataBlobService.getOrCreateDefault<number>(
            dataBlob,
            "testKey",
            9001
        )
        expect(createdTestKey).toEqual(9001)

        expect(DataBlobService.get<number>(dataBlob, "testKey")).toEqual(9001)
    })
})
