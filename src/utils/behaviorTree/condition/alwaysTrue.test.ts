import { beforeEach, describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "../../dataBlob/dataBlob"
import { AlwaysTrueCondition } from "./alwaysTrue"

describe("Always True condition", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns true when run", () => {
        const condition = new AlwaysTrueCondition(blackboard)
        expect(condition.run()).toBe(true)
    })

    it("can be cloned", () => {
        const original = new AlwaysTrueCondition(blackboard)
        const clone = original.clone()
        expect(clone.dataBlob).toEqual(original.dataBlob)
        expect(clone.run()).toBe(true)
    })
})
