import { beforeEach, describe, expect, it } from "vitest"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { SequenceComposite } from "./sequence"
import { IncrementBlackboard } from "../../testUtil/testIncrementBlackboard"

describe("Sequence composite", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new SequenceComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns false if one child returns false", () => {
        const sequence = new SequenceComposite(blackboard, [
            new AlwaysTrueCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns as soon as one child returns false", () => {
        const sequence = new SequenceComposite(blackboard, [
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new AlwaysFalseCondition(blackboard),
            new IncrementBlackboard(blackboard),
        ])
        expect(sequence.run()).toBe(false)
        expect(DataBlobService.get(blackboard, "increment")).toEqual(3)
    })
})
