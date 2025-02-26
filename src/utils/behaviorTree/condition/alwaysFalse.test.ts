import { beforeEach, describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "../../dataBlob/dataBlob"
import { AlwaysFalseCondition } from "./alwaysFalse"

describe("Always False condition", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns false when run", () => {
        const condition = new AlwaysFalseCondition(blackboard)
        expect(condition.run()).toBe(false)
    })
})
