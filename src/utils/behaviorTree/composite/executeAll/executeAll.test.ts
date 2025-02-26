import { beforeEach, describe, expect, it } from "vitest"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { IncrementBlackboard } from "../../testUtil/testIncrementBlackboard"
import { ExecuteAllComposite } from "./executeAll"

describe("Execute All composite", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("always returns true", () => {
        const sequence = new ExecuteAllComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(true)
    })

    it("executes all children", () => {
        const sequence = new ExecuteAllComposite(blackboard, [
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
        ])
        sequence.run()
        expect(DataBlobService.get<number>(blackboard, "increment")).toEqual(3)
    })
})
