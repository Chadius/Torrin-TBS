import { describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "./dataBlob"

describe("Blackboard", () => {
    it("Can store and retrieve data based on a key", () => {
        const blackboard: DataBlob = DataBlobService.new()
        DataBlobService.add<number>(blackboard, "testKey", 9001)
        expect(DataBlobService.get<number>(blackboard, "testKey")).toEqual(9001)
    })
})
