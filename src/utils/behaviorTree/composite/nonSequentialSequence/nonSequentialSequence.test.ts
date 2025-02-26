import { beforeEach, describe, expect, it, vi } from "vitest"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { NonSequentialSequenceComposite } from "./nonSequentialSequence"

describe("Non Sequential Selector composite", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new NonSequentialSequenceComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns false if one child returns false", () => {
        const falseTask: AlwaysFalseCondition = new AlwaysFalseCondition(
            blackboard
        )
        const falseTaskSpy = vi.spyOn(falseTask, "run")

        const sequence = new NonSequentialSequenceComposite(blackboard, [
            new AlwaysTrueCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
            falseTask,
        ])
        expect(sequence.run()).toBe(false)
        expect(falseTaskSpy).toHaveBeenCalled()
    })
})
