import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { UntilFailDecorator } from "./untilFail"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { LimitDecorator } from "../limit/limit"

describe("Until Fail decorator", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns true once the child task fails", () => {
        const failOnTheThirdAttempt: LimitDecorator = new LimitDecorator(
            blackboard,
            new AlwaysTrueCondition(blackboard),
            { limit: 2 }
        )
        const limitSpy = vi.spyOn(failOnTheThirdAttempt, "run")

        const condition = new UntilFailDecorator(
            blackboard,
            failOnTheThirdAttempt
        )
        expect(condition.run()).toBe(true)
        expect(limitSpy).toHaveBeenCalledTimes(3)
    })

    it("throws an error when run with without a task", () => {
        expect(() => {
            new UntilFailDecorator(blackboard, undefined)
        }).toThrow("[UntilFailDecorator.constructor] must have a child task")
    })

    it("can be cloned", () => {
        const original = new UntilFailDecorator(
            blackboard,
            new AlwaysFalseCondition(blackboard)
        )
        const clone: UntilFailDecorator = original.clone() as UntilFailDecorator
        expect(clone.dataBlob).toEqual(original.dataBlob)
        expect(clone.children).toEqual(original.children)
        expect(clone.children).not.toBe(original.children)
    })
})
